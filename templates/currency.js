Template.showMoney.helpers({
  valueStr: function() {
    return Template.instance().data.getStr();
  }
});

Template.currencySelector.helpers({
  highlightedCurrencies: function() {
    return Currency.findAll(true);
  },
  remainingCurrencies: function() {
    return Currency.findAll(false);
  },
  isSelected: function(code) {
    return Template.instance().data.code == code;
  }
});
