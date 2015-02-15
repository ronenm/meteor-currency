// Write your package code here!

var value_re = /%<value>(\d*)\.(\d+)?/;
var param_re = /%{([a-zA-Z0-9_-]+)}/g;

Currency  = function(country, code, symbol, format, default_flag) {
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
    this.default_flag = default_flag;
  }
  
  if (!format) {
    throw new Meteor.Error('currency-error',"Missing format for Currency");
  }
  
  var cache = Currency.format_cache;
  
  // Convert the format (which is based on Ruby to sprintf recognize format)
  if (!(cache[format] && cache.hasOwnProperty(format))) {
    this.sprintf_format = format.replace(value_re,function(match,size,scale) {
      this.scale = Math.pow(10,scale) || 100;
      return "%(value)" + size + '.' + scale;
    }).replace(param_re,"%(currency.$1)s");
    cache[format] = [this.sprintf_format,scale];
  } else {
    this.sprintf_format = cache[format][0];
    this.scale = cache[format][1];
  }
  
  if (default_flag) {
    Currency.default_currency = this;
  }
  
  // The cache is store by country code (in order to support coutry code only)
  var c_code = this.code.substring(0,2);
  if (!Currency.cache[c_code]) {
    Currency.cache[c_code] = {};
  }
  
  Currency.cache[c_code][this.code] = this;
  
  return this;
}

Currency.find_by_code = function(code) {
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

Currency.find_definitive = function(currency) {
  if (!currency) {
    if (Currency.default_currency) {
      currency = Currency.default_currency;
    } else {
      throw new Meteor.Error("currnecy-default-missing","Missing default currency");
    }
  } else if (typeof(currency)=="string") {
    var currency_inst = Currency.find_by_code(currency);
    if (!currency_inst) {
      throw new Meteor.Error("unknown-currency","Unknonwn currency " + currency);
    } else if (typeof(currency_inst) == 'array') {
      throw new Meteor.Error("too-many-currencies","Country with code " + currency + " has more than one currency");
    } 
    currency = currency_inst;
  } else if (!currency_inst instanceof Currency) {
      throw new Meteor.Error("wrong-currency","Wrong currency object");
  }
  return currency;
}

Currency.create_multiple = function(cur_array) {
  return _.map(cur_array,function(cur) {
    try {
      return new Currency(cur);
    } catch (e) {
      return "Error for " + cur.code + ": " + e;
    }
  });
}

Currency.format_cache = {};
Currency.cache = {};

Currency.prototype.to_str = function(value) {
  console.info(this);
  if (value == null) {
    return '';
  } else {
    return sprintf(this.sprintf_format,{currency: this, value: value});
  }
}

var parse_re = /(\d*\.\d+|\d+\.?)/;

Currency.prototype.parse_str = function(str) {
  if (str=='') {
    return null;
  }
  var match = parse_re.exec(str);
  if (match) {
    return eval(match[0]);
  } else {
    throw new Meteor.Error("currnecy-parse","Wrong currency value provided");
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

Currency.highlights = {};

Currency.find_all = function(highlight_partition) {
  var list = _.flatten(_.map(Currency.cache,function(val,code) {
    return _.values(val);
  }),true);
  
  if (highlight_partition==undefined) {
    return list;
  } else if (highlight_partition) {
    return _.filter(list,function (currency) {
      return Currency.highlights[currency.code];
    });
  } else {
    return _.filter(list,function (currency) {
      return !Currency.highlights[currency.code];
    });
  }
}

Currency.set_highlight = function() {
  var codes = _.flatten(arguments,true);
  
  Currency.highlights = {};
  Currency.append_highlight(codes);
}

Currency.append_highlight = function() {
  var codes = _.flatten(arguments,true);
  
  _.each(codes, function(code) {
    Currency.highlights[code] = true;
  });
}

