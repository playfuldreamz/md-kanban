/**
 * assignees plugin — extracts @username mentions from card descriptions.
 *
 * Stores as card.assignees (string[]). The UI renders colored initial chips.
 * Configure display names and colors via @assignees in preamble:
 *   @assignees {"alice": {"label":"Alice","color":"bg-pink-500"}, "bob":...}
 */
module.exports = {
  name: 'assignees',

  parseCard(card) {
    if (!card.description) return card;
    const matches = card.description.match(/@([a-zA-Z0-9_-]+)/g);
    if (!matches) return card;
    const assignees = [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
    card.assignees = assignees;
    // Don't strip @mentions from description — rawLine preserves them
    return card;
  },

  serializeCard(card, line) {
    // @mentions are already in rawLine/description — nothing to do
    return line;
  },
};
