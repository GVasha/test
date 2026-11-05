export const TRACK_DEFINITIONS = [
  {
    name: 'Standard Collection',
    description:
      'Confirm identity, present balance, then branch into payment, hardship, or dispute.',
    definition: {
      root: 'greet',
      nodes: {
        greet: {
          id: 'greet',
          prompt:
            'Hello, may I speak with {{name}}? This is an important call regarding account {{account_number}}.',
          field: 'identity_confirmed',
          choices: [
            {
              id: 'yes',
              label: 'Yes, speaking',
              keywords: ['yes', 'speaking', 'this is', "that's me", 'correct'],
              next: 'present_balance',
              saveValue: 'confirmed',
            },
            {
              id: 'no',
              label: 'Wrong person / not available',
              keywords: ['no', 'wrong', 'not here', 'unavailable', "isn't"],
              next: 'wrong_party',
              saveValue: 'not_confirmed',
            },
          ],
        },
        present_balance: {
          id: 'present_balance',
          prompt:
            'Thank you. Our records show an outstanding loan balance of {{loan_amount}}. Are you able to discuss repayment options today?',
          field: 'willing_to_discuss',
          choices: [
            {
              id: 'ready',
              label: 'Yes, ready to pay / arrange',
              keywords: ['yes', 'pay', 'ready', 'arrange', 'can pay'],
              next: 'payment_path',
              saveValue: 'yes',
            },
            {
              id: 'hardship',
              label: 'Having financial difficulty',
              keywords: ['hardship', 'difficult', 'cant', "can't", 'unemployed', 'no money'],
              next: 'hardship_path',
              saveValue: 'hardship',
            },
            {
              id: 'dispute',
              label: 'Dispute the balance',
              keywords: ['dispute', 'wrong amount', 'not mine', 'incorrect', 'disagree'],
              next: 'dispute_path',
              saveValue: 'dispute',
            },
            {
              id: 'callback',
              label: 'Need a callback later',
              keywords: ['callback', 'later', 'busy', 'call back', 'another time'],
              next: 'schedule_callback',
              saveValue: 'callback',
            },
          ],
        },
        payment_path: {
          id: 'payment_path',
          prompt:
            'Would you like to make a full payment of {{loan_amount}}, or set up a payment arrangement?',
          field: 'payment_preference',
          choices: [
            {
              id: 'full',
              label: 'Pay in full',
              keywords: ['full', 'all', 'entire', 'pay today'],
              next: 'confirm_full',
              saveValue: 'full',
            },
            {
              id: 'arrangement',
              label: 'Payment arrangement',
              keywords: ['arrangement', 'plan', 'installment', 'partial', 'monthly'],
              next: 'ask_arrangement',
              saveValue: 'arrangement',
            },
          ],
        },
        confirm_full: {
          id: 'confirm_full',
          prompt:
            'Great. Please confirm you will pay {{loan_amount}} in full within 7 days. Shall I note a promise to pay?',
          field: 'promise_to_pay',
          choices: [
            {
              id: 'confirm',
              label: 'Yes, promise to pay',
              keywords: ['yes', 'confirm', 'promise', 'agreed', 'ok'],
              outcome: 'promise_to_pay',
              saveValue: 'full_within_7_days',
            },
            {
              id: 'decline',
              label: 'Cannot commit',
              keywords: ['no', 'cannot', "can't", 'unable'],
              next: 'hardship_path',
              saveValue: 'declined',
            },
          ],
        },
        ask_arrangement: {
          id: 'ask_arrangement',
          prompt:
            'What monthly amount can you commit to, and on which day of the month?',
          field: 'arrangement_details',
          choices: [
            {
              id: 'provide',
              label: 'Provide amount and date',
              keywords: ['$', 'month', 'day', 'pay'],
              freeText: true,
              next: 'confirm_arrangement',
            },
          ],
        },
        confirm_arrangement: {
          id: 'confirm_arrangement',
          prompt:
            'Thank you. I have noted your proposed arrangement. A specialist will confirm the plan shortly. Is there anything else before we end the call?',
          field: 'final_notes',
          choices: [
            {
              id: 'done',
              label: 'Nothing else / end call',
              keywords: ['no', 'nothing', 'done', 'bye', 'thanks'],
              outcome: 'payment_arrangement',
              saveValue: 'none',
            },
            {
              id: 'notes',
              label: 'Add a note',
              keywords: ['yes', 'also', 'note'],
              freeText: true,
              outcome: 'payment_arrangement',
            },
          ],
        },
        hardship_path: {
          id: 'hardship_path',
          prompt:
            'I understand. Briefly, what is causing the difficulty — job loss, medical, reduced income, or something else?',
          field: 'hardship_reason',
          choices: [
            {
              id: 'job',
              label: 'Job loss / unemployment',
              keywords: ['job', 'unemployed', 'laid off', 'fired'],
              next: 'hardship_relief',
              saveValue: 'job_loss',
            },
            {
              id: 'medical',
              label: 'Medical expenses',
              keywords: ['medical', 'hospital', 'health', 'illness'],
              next: 'hardship_relief',
              saveValue: 'medical',
            },
            {
              id: 'income',
              label: 'Reduced income',
              keywords: ['income', 'hours', 'pay cut', 'reduced'],
              next: 'hardship_relief',
              saveValue: 'reduced_income',
            },
            {
              id: 'other',
              label: 'Other',
              keywords: ['other', 'else'],
              freeText: true,
              next: 'hardship_relief',
              saveValue: 'other',
            },
          ],
        },
        hardship_relief: {
          id: 'hardship_relief',
          prompt:
            'We can explore temporary relief: a short pause, reduced payment, or a callback with a hardship specialist. Which do you prefer?',
          field: 'relief_preference',
          choices: [
            {
              id: 'pause',
              label: 'Short payment pause',
              keywords: ['pause', 'defer', 'skip'],
              outcome: 'hardship_pause',
              saveValue: 'pause',
            },
            {
              id: 'reduced',
              label: 'Reduced payment',
              keywords: ['reduced', 'lower', 'smaller'],
              outcome: 'hardship_reduced',
              saveValue: 'reduced',
            },
            {
              id: 'specialist',
              label: 'Speak with specialist',
              keywords: ['specialist', 'callback', 'someone'],
              next: 'schedule_callback',
              saveValue: 'specialist',
            },
          ],
        },
        dispute_path: {
          id: 'dispute_path',
          prompt:
            'I am sorry for the confusion. What is the nature of your dispute — wrong amount, already paid, or not your account?',
          field: 'dispute_reason',
          choices: [
            {
              id: 'amount',
              label: 'Wrong amount',
              keywords: ['amount', 'wrong balance', 'incorrect amount'],
              next: 'dispute_note',
              saveValue: 'wrong_amount',
            },
            {
              id: 'paid',
              label: 'Already paid',
              keywords: ['paid', 'already paid', 'settled'],
              next: 'dispute_note',
              saveValue: 'already_paid',
            },
            {
              id: 'not_mine',
              label: 'Not my account',
              keywords: ['not mine', 'wrong person', 'identity'],
              next: 'dispute_note',
              saveValue: 'not_my_account',
            },
          ],
        },
        dispute_note: {
          id: 'dispute_note',
          prompt:
            'Please add any details that will help our review team (dates, payment references, etc.).',
          field: 'dispute_details',
          choices: [
            {
              id: 'details',
              label: 'Provide details',
              freeText: true,
              keywords: [],
              outcome: 'dispute',
            },
          ],
        },
        schedule_callback: {
          id: 'schedule_callback',
          prompt: 'What day and time should we call you back?',
          field: 'callback_time',
          choices: [
            {
              id: 'time',
              label: 'Provide day/time',
              freeText: true,
              outcome: 'callback_scheduled',
            },
          ],
        },
        wrong_party: {
          id: 'wrong_party',
          prompt:
            'Thank you for letting us know. We will update our records. Have a good day.',
          terminal: true,
          outcome: 'wrong_party',
          choices: [],
        },
      },
    },
  },
  {
    name: 'Hardship',
    description: 'Focused hardship intake: income/expense probes, relief options, callback.',
    definition: {
      root: 'intro',
      nodes: {
        intro: {
          id: 'intro',
          prompt:
            'Hi {{name}}, we understand you may be facing financial difficulty with account {{account_number}}. Is now a good time to talk about temporary options?',
          field: 'available',
          choices: [
            {
              id: 'yes',
              label: 'Yes',
              keywords: ['yes', 'ok', 'sure', 'fine'],
              next: 'income',
              saveValue: 'yes',
            },
            {
              id: 'no',
              label: 'Not now',
              keywords: ['no', 'busy', 'later'],
              next: 'callback',
              saveValue: 'no',
            },
          ],
        },
        income: {
          id: 'income',
          prompt: 'Roughly, what is your current monthly household income?',
          field: 'monthly_income',
          choices: [
            {
              id: 'income',
              label: 'State income amount',
              freeText: true,
              next: 'expenses',
            },
          ],
        },
        expenses: {
          id: 'expenses',
          prompt: 'And approximately what are your essential monthly expenses?',
          field: 'monthly_expenses',
          choices: [
            {
              id: 'expenses',
              label: 'State expense amount',
              freeText: true,
              next: 'cause',
            },
          ],
        },
        cause: {
          id: 'cause',
          prompt: 'What primarily caused the hardship?',
          field: 'hardship_cause',
          choices: [
            {
              id: 'job',
              label: 'Job loss',
              keywords: ['job', 'unemployed'],
              next: 'options',
              saveValue: 'job_loss',
            },
            {
              id: 'medical',
              label: 'Medical',
              keywords: ['medical', 'health'],
              next: 'options',
              saveValue: 'medical',
            },
            {
              id: 'other',
              label: 'Other',
              freeText: true,
              next: 'options',
              saveValue: 'other',
            },
          ],
        },
        options: {
          id: 'options',
          prompt:
            'Based on that, we can offer a 30-day pause, a reduced payment for 3 months, or a specialist callback. Which works best?',
          field: 'selected_relief',
          choices: [
            {
              id: 'pause',
              label: '30-day pause',
              keywords: ['pause', '30'],
              outcome: 'hardship_pause',
              saveValue: '30_day_pause',
            },
            {
              id: 'reduced',
              label: 'Reduced for 3 months',
              keywords: ['reduced', '3 months', 'lower'],
              outcome: 'hardship_reduced',
              saveValue: 'reduced_3_months',
            },
            {
              id: 'callback',
              label: 'Specialist callback',
              keywords: ['callback', 'specialist'],
              next: 'callback',
              saveValue: 'specialist',
            },
          ],
        },
        callback: {
          id: 'callback',
          prompt: 'What is the best day and time for a callback?',
          field: 'callback_time',
          choices: [
            {
              id: 'time',
              label: 'Provide time',
              freeText: true,
              outcome: 'callback_scheduled',
            },
          ],
        },
      },
    },
  },
  {
    name: 'Payment Arrangement',
    description: 'Propose plans, confirm date and amount, capture confirmation.',
    definition: {
      root: 'open',
      nodes: {
        open: {
          id: 'open',
          prompt:
            'Hello {{name}}. Regarding your balance of {{loan_amount}}, would you like to set up a payment arrangement today?',
          field: 'wants_arrangement',
          choices: [
            {
              id: 'yes',
              label: 'Yes',
              keywords: ['yes', 'sure', 'ok'],
              next: 'propose',
              saveValue: 'yes',
            },
            {
              id: 'no',
              label: 'No',
              keywords: ['no', 'not interested'],
              outcome: 'declined_arrangement',
              saveValue: 'no',
            },
          ],
        },
        propose: {
          id: 'propose',
          prompt:
            'Common options are 3 monthly payments, 6 monthly payments, or a custom amount. Which do you prefer?',
          field: 'plan_type',
          choices: [
            {
              id: 'three',
              label: '3 monthly payments',
              keywords: ['3', 'three'],
              next: 'confirm_day',
              saveValue: '3_months',
            },
            {
              id: 'six',
              label: '6 monthly payments',
              keywords: ['6', 'six'],
              next: 'confirm_day',
              saveValue: '6_months',
            },
            {
              id: 'custom',
              label: 'Custom amount',
              keywords: ['custom', 'other', 'different'],
              next: 'custom_amount',
              saveValue: 'custom',
            },
          ],
        },
        custom_amount: {
          id: 'custom_amount',
          prompt: 'What monthly payment amount can you commit to?',
          field: 'monthly_amount',
          choices: [
            {
              id: 'amount',
              label: 'State amount',
              freeText: true,
              next: 'confirm_day',
            },
          ],
        },
        confirm_day: {
          id: 'confirm_day',
          prompt: 'Which day of the month should we draft the payment?',
          field: 'payment_day',
          choices: [
            {
              id: 'day',
              label: 'State day of month',
              freeText: true,
              next: 'confirm_summary',
            },
          ],
        },
        confirm_summary: {
          id: 'confirm_summary',
          prompt:
            'To confirm: we will set up your arrangement for account {{account_number}}. Do you agree to this plan?',
          field: 'arrangement_confirmed',
          choices: [
            {
              id: 'agree',
              label: 'I agree',
              keywords: ['yes', 'agree', 'confirm', 'ok'],
              outcome: 'payment_arrangement',
              saveValue: 'confirmed',
            },
            {
              id: 'change',
              label: 'Need to change something',
              keywords: ['change', 'no', 'different'],
              next: 'propose',
              saveValue: 'needs_change',
            },
          ],
        },
      },
    },
  },
  {
    name: 'Dispute / Wrong Party',
    description: 'Capture dispute reason and notes for review, then close the call.',
    definition: {
      root: 'verify',
      nodes: {
        verify: {
          id: 'verify',
          prompt:
            'Hello, I am calling about loan account {{account_number}} listed under {{name}}. Are you the correct party?',
          field: 'correct_party',
          choices: [
            {
              id: 'yes',
              label: 'Yes, correct party',
              keywords: ['yes', 'correct', 'speaking'],
              next: 'dispute_type',
              saveValue: 'yes',
            },
            {
              id: 'no',
              label: 'Wrong party',
              keywords: ['no', 'wrong', 'not me'],
              next: 'wrong_party_end',
              saveValue: 'no',
            },
          ],
        },
        dispute_type: {
          id: 'dispute_type',
          prompt: 'What would you like to dispute today?',
          field: 'dispute_type',
          choices: [
            {
              id: 'balance',
              label: 'Balance amount',
              keywords: ['balance', 'amount'],
              next: 'details',
              saveValue: 'balance',
            },
            {
              id: 'ownership',
              label: 'Account ownership',
              keywords: ['ownership', 'not mine', 'identity'],
              next: 'details',
              saveValue: 'ownership',
            },
            {
              id: 'payment',
              label: 'Prior payment not applied',
              keywords: ['payment', 'paid', 'not applied'],
              next: 'details',
              saveValue: 'prior_payment',
            },
          ],
        },
        details: {
          id: 'details',
          prompt:
            'Please share any details, dates, or reference numbers for our review team.',
          field: 'dispute_details',
          choices: [
            {
              id: 'note',
              label: 'Provide details',
              freeText: true,
              next: 'close',
            },
          ],
        },
        close: {
          id: 'close',
          prompt:
            'Thank you. Your dispute has been logged for review. You will receive a written acknowledgment. Goodbye.',
          terminal: true,
          outcome: 'dispute',
          choices: [],
        },
        wrong_party_end: {
          id: 'wrong_party_end',
          prompt:
            'Understood. We will flag this account for skip-trace review and stop contacting this number for {{name}}. Goodbye.',
          terminal: true,
          outcome: 'wrong_party',
          choices: [],
        },
      },
    },
  },
];
