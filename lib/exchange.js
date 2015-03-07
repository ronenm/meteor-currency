Exchange = function(to,from,callback) {
  if (typeof(from)=='function') {
    callback = from;
    from = undefined;
  }
  
  // We support multiple exchange in a single commend!
  if (typeof(from) != 'array') {
    from = [ from ];
  }
  if (typeof(to) != 'array') {
    to = [ to ];
  }
  
  from = _.map(from, Currency.findDefinitive);
  to = _.map(to, Currency.findDefinitive);
  
  var pairs = [];
  for(var f_idx = 0; f_idx<from.length; f_idx++) {
    for(var t_idx = 0; t_idx<to.length; t_idx++) {
      pairs.push(from[f_idx].code + to[t_idx].code);
    }
  }
  
  // Support both synchronous and asynchronous operations
  if (typeof(callback)=="function") {
    return Exchange.execYQL(pairs, function(error, result) {
      if (error) {
        callback.call(this,error,null);
      } else {
        callback.call(this,error,result.data.query.results.rate);
      }
    })
  } else {
    var result = Exchange.execYQL(pairs);
    return result.data.query.results.rate;
  }
}

Exchange.execYQL = function(pairs,callback) {
  var sql = sprintf('select * from yahoo.finance.xchange where pair in (%s)','"' + pairs.join('","') + '"');
  console.log("Sending SQL: " + sql);
  return HTTP.get("https://query.yahooapis.com/v1/public/yql",
           { params: {
              q: sql,
              format: 'json',
              diagnostics: false,
              env: "store://datatables.org/alltableswithkeys"
            }
           }, callback);
}

// On the server extend Money with Exchange
if (Meteor.isServer) {
  // On the server perform an online immediate exchange conversion
  Money.prototype.exchange = function(to) {
    to = Currency.findDefinitive(to);
    var rate = eval(Exchange(to,this.currency).Rate);
    if (!rate) {
      throw new Meteor.Error('no-exchange',"Unable to exchange " + this.currency.code + ' to ' + to.code);
    }
    return new Money(this.value*rate,to);
  }
}
