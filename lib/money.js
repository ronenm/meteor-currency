Money = function(value,currency) {
  currency = Currency.findDefinitive(currency);
  
  this.currency = currency;
  if (typeof(value) === 'string' && value) {
    this.value = currency.parseStr(value);
  } else if (typeof(value) === 'number') {
    this.value = value;
  } else if (value instanceof Money) {
    this.value = value.value;
  } else if (!value) {
    this.value = null;
  } else {
    throw Meteor.Error('money-value-error',"Un recognized Money value");
  }
  if (this.value!==null) {
    var scale = currency.scale;
    this.value = Math.round(this.value * scale) / scale;
  }
  return this;
}

_.extend(Money.prototype,{
  toStr: function() {
    return this.currency.toStr(this.value);
  },
  parseStr: function(str) {
    return this.value = this.currency.parseStr(str);
  }
});


Money.equal = function(m1,m2) {
  if (!(m1||m2)) {
    return true;
  } else if (!m1 && m2 || m1 && !m2) {
    return false;
  } else {
    return (Currency.equal(m1.currency,m2.currency) && (m1.value==m2.value));
  }
}

