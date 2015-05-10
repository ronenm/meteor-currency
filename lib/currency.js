// Write your package code here!

var valueRe = /%<value>(\d*)\.(\d+)?/;
var paramRe = /%{([a-zA-Z0-9_-]+)}/g;

Currency  = function(country, code, symbol, format, defaultFlag) {
  var self = this;
  if (typeof(country) == 'object') {
    for(k in country) {
      self[k] = country[k];
    }
    format = self.format;
  } else {
    self.country = country;
    self.code = code;
    self.symbol = symbol;
    self.format = format;
    self.defaultFlag = defaultFlag;
  }
  
  if (!format) {
    throw new Meteor.Error('currency-error',"Missing format for Currency");
  }
  
  var cache = Currency.formatCache;
  
  // Convert the format (which is based on Ruby to sprintf recognize format)
  if (!(cache[format] && cache.hasOwnProperty(format))) {
    self.sprintfFormat = format.replace(valueRe,function(match,size,scale) {
      self.scale = Math.pow(10,scale) || 100;
      return "%(value)" + size + '.' + scale;
    }).replace(paramRe,"%(currency.$1)s");
    cache[format] = [self.sprintfFormat,self.scale];
  } else {
    self.sprintfFormat = cache[format][0];
    self.scale = cache[format][1];
  }
  
  if (self.defaultFlag) {
    if (Currency.defaultCurrency) {
      Currency.defaultCurrency.defaultFlag = false;
    }
    Currency.defaultCurrency = self;
  }
  
  // The cache is store by country code (in order to support coutry code only)
  var c_code = self.code.substring(0,2);
  if (!Currency.cache[c_code]) {
    Currency.cache[c_code] = {};
  }
  
  Currency.cache[c_code][self.code] = self;
  
  return self;
}

Currency.findByCode = function(code) {
  if (code.length<2 || code.length>3) {
    throw new Meteor.Error("wrong-currency-code","You can either use a two characters country code or three characters currency code");
  }
  
  if (code.length==2) {
    var list = _.values(Currency.cache[code]);
    return list && list.length==1 ? list[0] : list;
  } else {
    var list = Currency.cache[code.substring(0,2)];
    if (list && list[code]) {
      return list[code];
    }
    return null;
  }
}

// Use setDefault only after loading in all currencies
Currency.setDefault = function(currency) {
  if (!currency) {
    throw new Meteor.Error("set-default-no-currency","Missing default currency");
  }
  var currencyInst = Currency.findDefinitive(currency);
  if (Currency.defaultCurrency) {
      Currency.defaultCurrency.defaultFlag = false;
  }
  currencyInst.defaultFlag = true;
  Currency.defaultCurrency = currencyInst.defaultFlag;
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
  } else if (!(currency instanceof Currency)) {
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
    return Currency.parseStr(str);
  }
});

Currency.parseStr = function(str) {
  if (typeof(str)=='number') {
    return str;
  }

  if (str=='' || typeof(str)!='string') {
    return null;
  }
  var match = parseRe.exec(str);
  if (match) {
    return eval(match[0]);
  } else {
    throw new Meteor.Error("currency-parse","Wrong currency value provided");
  }
}

Currency.equal = function(c1,c2) {
  if (!(c1||c2)) {
    return true;
  } else if (!c1 && c2 || c1 && !c2) {
    return false;
  } else {
    return (c1.code == c2.code);
  }
  
}

Currency.LegalMoneyString = Match.Where(function(str) {
  if (Match.test(str,String)) {
    return parseRe.test(str);
  } else {
    return false;
  }
  
});

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

