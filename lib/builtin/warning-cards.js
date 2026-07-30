/**
 * warning-cards plugin — recognizes - [!] syntax for warning cards.
 *
 * Warning cards get an amber left border and ⚠ indicator in the UI.
 */
module.exports = {
  name: 'warning-cards',

  parseCard(card, rawLine) {
    if (/^\s*- \[!\]/.test(rawLine)) {
      card.warning = true;
    }
    return card;
  },

  serializeCard(card, line) {
    if (card.warning) {
      // Replace - [ ] or - [x] with - [!]
      return line.replace(/^(\s*)- \[[ x]\]/, '$1- [!]');
    }
    return line;
  },
};
