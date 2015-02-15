Template.showMoney.helpers({
  value_str: function() {
    return Template.instance().data.get_str();
  }
});

Template.currencySelector.helpers({
  highlightedCurrencies: function() {
    return Currency.find_all(true);
  },
  remainingCurrencies: function() {
    return Currency.find_all(false);
  },
  isSelected: function(code) {
    return Template.instance().data.code == code;
  }
});
