import db from '../db/index.js';
import {
  applyChoice,
  getNode,
  interpolatePrompt,
  parseTrackDefinition,
  resolveChoice,
} from './trackEngine.js';

function getCallBundle(callId) {
  const call = db
    .prepare(
      `SELECT c.*, t.definition_json, t.name AS track_name,
              ct.name AS contact_name, ct.phone, ct.account_number, ct.loan_amount
       FROM calls c
       JOIN tracks t ON t.id = c.track_id
       JOIN contacts ct ON ct.id = c.contact_id
       WHERE c.id = ?`
    )
    .get(callId);
  if (!call) return null;

  const messages = db
    .prepare(
      `SELECT id, role, content, created_at FROM call_messages
       WHERE call_id = ? ORDER BY id ASC`
    )
    .all(callId);

  const answers = db
    .prepare(
      `SELECT id, field_key, value, node_id, created_at FROM call_answers
       WHERE call_id = ? ORDER BY id ASC`
    )
    .all(callId);

  return { call, messages, answers };
}

function serializeCall(bundle) {
  if (!bundle) return null;
  const { call, messages, answers } = bundle;
  const definition = parseTrackDefinition(call.definition_json);
  const currentNode = call.current_node_id
    ? getNode(definition, call.current_node_id)
    : null;

  return {
    id: call.id,
    campaign_id: call.campaign_id,
    contact_id: call.contact_id,
    track_id: call.track_id,
    track_name: call.track_name,
    status: call.status,
    outcome: call.outcome,
    current_node_id: call.current_node_id,
    started_at: call.started_at,
    ended_at: call.ended_at,
    contact: {
      id: call.contact_id,
      name: call.contact_name,
      phone: call.phone,
      account_number: call.account_number,
      loan_amount: call.loan_amount,
    },
    current_node: currentNode
      ? {
          id: currentNode.id,
          prompt: interpolatePrompt(currentNode.prompt, {
            name: call.contact_name,
            phone: call.phone,
            account_number: call.account_number,
            loan_amount: call.loan_amount,
          }),
          field: currentNode.field || null,
          choices: (currentNode.choices || []).map((c) => ({
            id: c.id,
            label: c.label,
            freeText: Boolean(c.freeText),
          })),
          terminal: Boolean(currentNode.terminal),
        }
      : null,
    messages,
    answers,
  };
}

export function getCall(callId) {
  return serializeCall(getCallBundle(callId));
}

export function startCall({ campaignId, contactId } = {}) {
  let campaign;
  let contactRow;

  if (campaignId && contactId) {
    campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    contactRow = db
      .prepare(
        `SELECT cc.*, c.name, c.phone, c.account_number, c.loan_amount
         FROM campaign_contacts cc
         JOIN contacts c ON c.id = cc.contact_id
         WHERE cc.campaign_id = ? AND cc.contact_id = ?`
      )
      .get(campaignId, contactId);
  } else if (campaignId) {
    campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    contactRow = db
      .prepare(
        `SELECT cc.*, c.name, c.phone, c.account_number, c.loan_amount
         FROM campaign_contacts cc
         JOIN contacts c ON c.id = cc.contact_id
         WHERE cc.campaign_id = ? AND cc.call_status = 'queued'
         ORDER BY cc.id ASC LIMIT 1`
      )
      .get(campaignId);
  } else {
    throw new Error('campaignId is required');
  }

  if (!campaign) throw new Error('Campaign not found');
  if (!contactRow) throw new Error('No queued contacts for this campaign');

  if (campaign.status === 'draft') {
    db.prepare(`UPDATE campaigns SET status = 'active' WHERE id = ?`).run(campaign.id);
  }

  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(campaign.track_id);
  if (!track) throw new Error('Track not found');

  const definition = parseTrackDefinition(track.definition_json);
  const root = getNode(definition, definition.root);
  const prompt = interpolatePrompt(root.prompt, {
    name: contactRow.name,
    phone: contactRow.phone,
    account_number: contactRow.account_number,
    loan_amount: contactRow.loan_amount,
  });

  const startTxn = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO calls (campaign_id, contact_id, track_id, status, current_node_id)
         VALUES (?, ?, ?, 'in_progress', ?)`
      )
      .run(campaign.id, contactRow.contact_id, track.id, root.id);

    const callId = result.lastInsertRowid;

    db.prepare(
      `INSERT INTO call_messages (call_id, role, content) VALUES (?, 'agent', ?)`
    ).run(callId, prompt);

    db.prepare(
      `UPDATE campaign_contacts SET call_status = 'in_progress'
       WHERE campaign_id = ? AND contact_id = ?`
    ).run(campaign.id, contactRow.contact_id);

    // Terminal root with no choices ends immediately
    if (root.terminal && (!root.choices || root.choices.length === 0)) {
      completeCall(callId, root.outcome || 'completed', root.id);
    }

    return callId;
  });

  const callId = startTxn();
  return getCall(callId);
}

function completeCall(callId, outcome, nodeId = null) {
  db.prepare(
    `UPDATE calls SET status = 'completed', outcome = ?, ended_at = datetime('now'),
     current_node_id = COALESCE(?, current_node_id)
     WHERE id = ?`
  ).run(outcome, nodeId, callId);

  const call = db.prepare('SELECT campaign_id, contact_id FROM calls WHERE id = ?').get(callId);
  if (call) {
    db.prepare(
      `UPDATE campaign_contacts SET call_status = 'completed'
       WHERE campaign_id = ? AND contact_id = ?`
    ).run(call.campaign_id, call.contact_id);

    const remaining = db
      .prepare(
        `SELECT COUNT(*) AS c FROM campaign_contacts
         WHERE campaign_id = ? AND call_status IN ('queued', 'in_progress')`
      )
      .get(call.campaign_id).c;

    if (remaining === 0) {
      db.prepare(`UPDATE campaigns SET status = 'completed' WHERE id = ?`).run(call.campaign_id);
    }
  }
}

export function replyToCall(callId, { choiceId, replyText } = {}) {
  const bundle = getCallBundle(callId);
  if (!bundle) throw new Error('Call not found');

  const { call } = bundle;
  if (call.status !== 'in_progress') {
    throw new Error('Call is not in progress');
  }

  const definition = parseTrackDefinition(call.definition_json);
  const node = getNode(definition, call.current_node_id);
  const contact = {
    name: call.contact_name,
    phone: call.phone,
    account_number: call.account_number,
    loan_amount: call.loan_amount,
  };

  const choice = resolveChoice(node, { choiceId, replyText });
  if (!choice && node.choices?.length) {
    throw new Error('Could not match a reply to a track choice. Pick a choice or rephrase.');
  }

  const borrowerContent = replyText?.trim() || choice?.label || '';
  const result = applyChoice(definition, node, choice || {}, borrowerContent);

  const txn = db.transaction(() => {
    if (borrowerContent) {
      db.prepare(
        `INSERT INTO call_messages (call_id, role, content) VALUES (?, 'borrower', ?)`
      ).run(callId, borrowerContent);
    }

    const insertAnswer = db.prepare(
      `INSERT INTO call_answers (call_id, field_key, value, node_id) VALUES (?, ?, ?, ?)`
    );
    for (const ans of result.saved) {
      insertAnswer.run(callId, ans.field_key, ans.value, ans.node_id);
    }

    if (result.done) {
      let closingPrompt = result.terminalPrompt
        ? interpolatePrompt(result.terminalPrompt, contact)
        : null;

      if (result.nextNodeId && result.terminalPrompt) {
        db.prepare(`UPDATE calls SET current_node_id = ? WHERE id = ?`).run(
          result.nextNodeId,
          callId
        );
        db.prepare(
          `INSERT INTO call_messages (call_id, role, content) VALUES (?, 'agent', ?)`
        ).run(callId, closingPrompt);
      } else if (!closingPrompt) {
        closingPrompt = `Thank you. This call is complete. Outcome: ${result.outcome}.`;
        db.prepare(
          `INSERT INTO call_messages (call_id, role, content) VALUES (?, 'agent', ?)`
        ).run(callId, closingPrompt);
      }

      completeCall(callId, result.outcome, result.nextNodeId || call.current_node_id);
    } else {
      const nextNode = getNode(definition, result.nextNodeId);
      const nextPrompt = interpolatePrompt(nextNode.prompt, contact);

      db.prepare(`UPDATE calls SET current_node_id = ? WHERE id = ?`).run(
        result.nextNodeId,
        callId
      );
      db.prepare(
        `INSERT INTO call_messages (call_id, role, content) VALUES (?, 'agent', ?)`
      ).run(callId, nextPrompt);

      if (nextNode.terminal && (!nextNode.choices || nextNode.choices.length === 0)) {
        completeCall(callId, nextNode.outcome || 'completed', nextNode.id);
      }
    }
  });

  txn();
  return getCall(callId);
}

export function listResults({ campaignId } = {}) {
  let sql = `
    SELECT c.id, c.status, c.outcome, c.started_at, c.ended_at,
           c.campaign_id, camp.name AS campaign_name,
           ct.name AS contact_name, ct.phone, ct.account_number, ct.loan_amount,
           t.name AS track_name,
           (SELECT COUNT(*) FROM call_answers a WHERE a.call_id = c.id) AS answer_count
    FROM calls c
    JOIN campaigns camp ON camp.id = c.campaign_id
    JOIN contacts ct ON ct.id = c.contact_id
    JOIN tracks t ON t.id = c.track_id
  `;
  const params = [];
  if (campaignId) {
    sql += ' WHERE c.campaign_id = ?';
    params.push(campaignId);
  }
  sql += ' ORDER BY c.id DESC';
  return db.prepare(sql).all(...params);
}

export function getDashboardStats() {
  const contacts = db.prepare(`SELECT COUNT(*) AS c FROM contacts`).get().c;
  const campaigns = db.prepare(`SELECT COUNT(*) AS c FROM campaigns`).get().c;
  const calls = db.prepare(`SELECT COUNT(*) AS c FROM calls`).get().c;
  const completed = db
    .prepare(`SELECT COUNT(*) AS c FROM calls WHERE status = 'completed'`)
    .get().c;
  const inProgress = db
    .prepare(`SELECT COUNT(*) AS c FROM calls WHERE status = 'in_progress'`)
    .get().c;
  const queued = db
    .prepare(
      `SELECT COUNT(*) AS c FROM campaign_contacts WHERE call_status = 'queued'`
    )
    .get().c;

  const outcomes = db
    .prepare(
      `SELECT COALESCE(outcome, 'unknown') AS outcome, COUNT(*) AS count
       FROM calls WHERE status = 'completed'
       GROUP BY outcome ORDER BY count DESC`
    )
    .all();

  const recentCalls = db
    .prepare(
      `SELECT c.id, c.status, c.outcome, c.started_at, c.ended_at,
              ct.name AS contact_name, camp.name AS campaign_name
       FROM calls c
       JOIN contacts ct ON ct.id = c.contact_id
       JOIN campaigns camp ON camp.id = c.campaign_id
       ORDER BY c.id DESC LIMIT 8`
    )
    .all();

  return {
    contacts,
    campaigns,
    calls,
    completed,
    inProgress,
    queued,
    outcomes,
    recentCalls,
  };
}
