// Write your package code here!

var valueRe = /%<value>(\d*)\.(\d+)?/;
var paramRe = /%{([a-zA-Z0-9_-]+)}/g;

Currency  = function(country, code, symbol, format, defaultFlag) {
  if (typeof(country) == 'object') {
    for(k in country) {
      this[k] = country[k];
    }
    format = this.format;
  } else {
    this.country = country;
    this.code = code;
    this.symbol = symbol;
    this.format = format;
    this.defaultFlag = defaultFlag;
  }
  
  if (!format) {
    throw new Meteor.Error('currency-error',"Missing format for Currency");
  }
  
  var cache = Currency.formatCache;
  
  // Convert the format (which is based on Ruby to sprintf recognize format)
  if (!(cache[format] && cache.hasOwnProperty(format))) {
    this.sprintfFormat = format.replace(valueRe,function(match,size,scale) {
      this.scale = Math.pow(10,scale) || 100;
      return "%(value)" + size + '.' + scale;
    }).replace(paramRe,"%(currency.$1)s");
    cache[format] = [this.sprintfFormat,scale];
  } else {
    this.sprintfFormat = cache[format][0];
    this.scale = cache[format][1];
  }
  
  if (defaultFlag) {
    Currency.defaultCurrency = this;
  }
  
  // The cache is store by country code (in order to support coutry code only)
  var c_code = this.code.substring(0,2);
  if (!Currency.cache[c_code]) {
    Currency.cache[c_code] = {};
  }
  
  Currency.cache[c_code][this.code] = this;
  
  return this;
}

Currency.findByCode = function(code) {
  if (code.length<2 || code.length>3) {
    throw new Meteor.Error("wrong-currency-code","You can either use a two characters country code or three characters currency code");
  }
  
  if (code.length==2) {
    var list = _.values(Currency.cache[code]);
    return list.length==1 ? list[0] : list;
  } else {
    var list = Currency.cache[code.substring(0,2)];
    if (list[code]) {
      return list[code];
    }
    return null;
  }
}

Currency.findDefinitive = function(currency) {
  if (!currency) {
    if (Currency.defaultCurrency) {
      currency = Currency.defaultCurrency;
    } else {
      throw new Meteor.Error("currnecy-default-missing","Missing default currency");
    }
  } else if (typeof(currency)=="string") {
    var currencyInst = Currency.findByCode(currency);
    if (!currencyInst) {
      throw new Meteor.Error("unknown-currency","Unknonwn currency " + currency);
    } else if (typeof(currencyInst) == 'array') {
      throw new Meteor.Error("too-many-currencies","Country with code " + currency + " has more than one currency");
    } 
    currency = currencyInst;
  } else if (!currencyInst instanceof Currency) {
      throw new Meteor.Error("wrong-currency","Wrong currency object");
  }
  return currency;
}

Currency.createMultiple = function(cur_array) {
  return _.map(cur_array,function(cur) {
    try {
      return new Currency(cur);
    } catch (e) {
      return "Error for " + cur.code + ": " + e;
    }
  });
}

Currency.formatCache = {};
Currency.cache = {};
var parseRe = /(-?\d*\.\d+|-?\d+\.?)/;

_.extend(Currency.prototype,{
  toStr: function(value) {
    console.info(this);
    if (value == null) {
      return '';
    } else {
      return sprintf(this.sprintfFormat,{currency: this, value: value});
    }
  },
  parseStr: function(str) {
    if (str=='') {
      return null;
    }
    var match = parseRe.exec(str);
    if (match) {
      return eval(match[0]);
    } else {
      throw new Meteor.Error("currnecy-parse","Wrong currency value provided");
    }
  }
});

Currency.equal = function(c1,c2) {
  if (!(c1||c2)) {
    return true;
  } else if (!c1 && c2 || c1 && !c2) {
    return false;
  } else {
    return (c1.code == c2.code);
  }
  
}

Currency.highlights = {};

Currency.findAll = function(highlightPartition) {
  var list = _.flatten(_.map(Currency.cache,function(val,code) {
    return _.values(val);
  }),true);
  
  if (highlightPartition==undefined) {
    return list;
  } else if (highlightPartition) {
    return _.filter(list,function (currency) {
      return Currency.highlights[currency.code];
    });
  } else {
    return _.filter(list,function (currency) {
      return !Currency.highlights[currency.code];
    });
  }
}

Currency.setHighlight = function() {
  var codes = _.flatten(arguments,true);
  
  Currency.highlights = {};
  Currency.appendHighlight(codes);
}

Currency.appendHighlight = function() {
  var codes = _.flatten(arguments,true);
  
  _.each(codes, function(code) {
    Currency.highlights[code] = true;
  });
}

