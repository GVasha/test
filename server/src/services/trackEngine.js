/**
 * Track definition shape:
 * {
 *   root: "node_id",
 *   nodes: {
 *     [id]: {
 *       id, prompt, field?, terminal?, outcome?,
 *       choices: [{ id, label, keywords?, next?, outcome?, saveValue? }]
 *     }
 *   }
 * }
 */

export function parseTrackDefinition(definitionJson) {
  const def = typeof definitionJson === 'string' ? JSON.parse(definitionJson) : definitionJson;
  if (!def?.root || !def?.nodes) {
    throw new Error('Invalid track definition');
  }
  return def;
}

export function getNode(definition, nodeId) {
  const node = definition.nodes[nodeId];
  if (!node) throw new Error(`Unknown track node: ${nodeId}`);
  return node;
}

export function interpolatePrompt(prompt, contact = {}) {
  return prompt
    .replaceAll('{{name}}', contact.name ?? 'the borrower')
    .replaceAll('{{loan_amount}}', formatMoney(contact.loan_amount))
    .replaceAll('{{account_number}}', contact.account_number ?? 'your account')
    .replaceAll('{{phone}}', contact.phone ?? '');
}

function formatMoney(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount ?? '');
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

/**
 * Match borrower reply to a choice by explicit choiceId or keyword heuristics.
 */
export function resolveChoice(node, { choiceId, replyText } = {}) {
  if (!node.choices?.length) return null;

  if (choiceId) {
    const byId = node.choices.find((c) => c.id === choiceId);
    if (byId) return byId;
  }

  const text = (replyText || '').trim().toLowerCase();
  if (!text) return null;

  let best = null;
  let bestScore = 0;

  for (const choice of node.choices) {
    const keywords = (choice.keywords || [choice.label]).map((k) => String(k).toLowerCase());
    let score = 0;
    for (const kw of keywords) {
      if (!kw) continue;
      if (text === kw) score += 10;
      else if (text.includes(kw)) score += 3 + Math.min(kw.length / 10, 2);
    }
    if (score > bestScore) {
      bestScore = score;
      best = choice;
    }
  }

  // Free-text fallback: if node has a single free-text style choice, use it
  if (!best && node.choices.length === 1 && node.choices[0].freeText) {
    return node.choices[0];
  }

  // Soft fallback: pick "other"/default if present when nothing matched
  if (!best) {
    best =
      node.choices.find((c) => c.id === 'other' || c.default) ||
      (node.choices.length === 1 ? node.choices[0] : null);
  }

  return best;
}

export function applyChoice(definition, node, choice, replyText) {
  const saved = [];
  if (node.field) {
    const value = choice?.saveValue ?? replyText ?? choice?.label ?? '';
    saved.push({ field_key: node.field, value: String(value), node_id: node.id });
  }
  if (choice?.saveField && choice?.saveValue != null) {
    saved.push({
      field_key: choice.saveField,
      value: String(choice.saveValue),
      node_id: node.id,
    });
  }

  if (choice?.outcome || node.terminal) {
    return {
      nextNodeId: null,
      outcome: choice?.outcome || node.outcome || 'completed',
      saved,
      done: true,
    };
  }

  const nextNodeId = choice?.next;
  if (!nextNodeId) {
    return {
      nextNodeId: null,
      outcome: choice?.outcome || 'completed',
      saved,
      done: true,
    };
  }

  const nextNode = getNode(definition, nextNodeId);
  if (nextNode.terminal && (!nextNode.choices || nextNode.choices.length === 0)) {
    return {
      nextNodeId: nextNode.id,
      outcome: nextNode.outcome || 'completed',
      saved,
      done: true,
      terminalPrompt: nextNode.prompt,
    };
  }

  return {
    nextNodeId: nextNode.id,
    outcome: null,
    saved,
    done: false,
  };
}
