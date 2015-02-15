Money = function(value,currency) {
  currency = Currency.find_definitive(currency);
  
  this.currency = currency;
  if (typeof(value) == 'string' && value) {
    this.value = currency.parse_str(value);
  } else {
    this.value = value;
  }
  var scale = currency.scale;
  this.value = Math.round(this.value * scale) / scale;
}

Money.prototype.to_str = function() {
  return this.currency.to_str(this.value);
}

Money.prototype.parse_str = function(str) {
  return this.value = this.currency.parse_str(str);
}

Money.equal = function(m1,m2) {
  if (!(m1||m2)) {
    return true;
  } else if (!m1 && m2 || m1 && !m2) {
    return false;
  } else {
    return (Currency.equal(m1.currency,m2.currency) && (m1.value==m2.value));
  }
}


