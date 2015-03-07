// Add reactivity to the Money and Exchange support
// Including support of getting exchange rate on the client!

// On the client we perform a reactive calculations!
Exchange.exchangeCache = {};

Exchange.exchangeIntervalMin = 10;  // The interval in minutes (you can use partial minutes)

var _updateExchangeCallback = function(error,result) {
  if (!error) {
    var rates = result.data.query.results.rate;
    if (!_.isArray(rates)) {
      rates = [ rates ];
    }
    var cache = Exchange.exchangeCache;
    _.each(rates,function(rate) {
      var rate_val = eval(rate.Rate);
      if (!(cache[rate.id] && cache.hasOwnProperty(rate.id))) {
        cache[rate.id] = new ReactiveVar(rate_val || null);
      } else {
        cache[rate.id].set(rate_val || null);
      }
    });
  }
}

Exchange.registerExchange = function(to,from) {
  from = Currency.findDefinitive(from);
  to = Currency.findDefinitive(to);
  var key = from.code + to.code;
  var cache = Exchange.exchangeCache;
  var forceFlag = false;
  
  if (!(cache[key] && cache.hasOwnProperty(key))) {  
    cache[key] = new ReactiveVar(null);
    cache[key]._referenceCounter = 1;
    forceFlag = true;
  } else {
    cache[key]._referenceCounter++;
  }
  Exchange.downloadExchangeNow(forceFlag);
  return cache[key];
}

Exchange.unregisterExchange = function(to,from) {
  from = Currency.findDefinitive(from);
  to = Currency.findDefinitive(to);
  var key = from.code + to.code;
  var cache = Exchange.exchangeCache;
  
  if (cache[key] && cache.hasOwnProperty(key)) {
    cache[key]._referenceCounter--;
    if (cache[key]._referenceCounter<=0) {
      delete cache[key];
    }
  }
  Exchange.downloadExchangeNow();
  return true;
}

Exchange._downloadExchange  = function() {
  Exchange.exec_yql(_.keys(Exchange.exchangeCache), _updateExchangeCallback);
}

Exchange.downloadExchangeNow = function(force) {
  var exchangeCache_size = _.keys(Exchange.exchangeCache).length;
  if ((force || exchangeCache_size<=0) && Exchange._exchange_interval_id) {
    Meteor.clearInterval(Exchange._exchange_interval_id);
    delete Exchange._exchange_interval_id;
  }
  if (exchangeCache_size>0 && !Exchange._exchange_interval_id) {
    Exchange._downloadExchange();
    // It is enough to perform a download every 10 minutes
    Exchange._exchange_interval_id = Meteor.setInterval(Exchange._downloadExchange,
                                                        Math.round(Exchange.exchangeIntervalMin*60000));
  }
}

// This method allows you to create a general Money reactive variable
// (that changes when you replace the money instance all together)
Money.newReactiveVar = function(money) {
  return new ReactiveVar(money,Money.equal);
}

Money.prototype.createReactiveVar = function() {  
  return Money.newReactiveVar(this);
}

// Now to an exchange rate reactive variable

// But let's add a reactivity to the Money's value
Money.prototype.reactivateValue  = function() {  
  if (!(this._reactive && this._reactive instanceof ReactiveVar)) {
    this._reactive = new ReactiveVar(this.value);
  }
  return this._reactive;
}

Money.prototype.getValue = function() {
  return this.reactivateValue().get();
}

Money.prototype.getStr = function() {
  this.getValue();
  return this.to_str();
}

Money.prototype.setValue = function(val) {
  this.value = val;
  if (this._reactive && this._reactive instanceof ReactiveVar) {
    this._reactive.set(this.value);
  }
}

Money.prototype.setStr = function(str) {
  this.parse_str(str);
  if (this._reactive && this._reactive instanceof ReactiveVar) {
    this._reactive.set(this.value);
  }
}

// This creates a new_money which value is updated when
// the original value or exchange rate is updated
// Note that new_money is not immediatly reactive, you should
// call new_money.getValue() (or getStr() to make it reactive)
Money.prototype.exchange = function(to) {
  to = Currency.findDefinitive(to);
  var rate = Exchange.registerExchange(to, this.currency);
  var self = this;
  var new_money = new Money(null,to);
  new_money.exchangeOrig = self; // Mark this instance as derived from this
  
  new_money._exchangeTracker = Tracker.autorun(function() {
    var rate_val = rate.get();
    var orig_val = self.getValue();
    new_money.setValue(rate_val ? rate_val*orig_val : null);
  });
  return new_money;
}

// This allows the exchange tracker to be stopped
Money.prototype.stopExchangeTracker = function() {
  this._exchangeTracker.stop();
}
