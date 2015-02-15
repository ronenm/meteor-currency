// Add reactivity to the Money and Exchange support
// Including support of getting exchange rate on the client!

// On the client we perform a reactive calculations!
Exchange.exchange_cache = {};

Exchange.exchange_interval_min = 10;  // The interval in minutes (you can use partial minutes)

var _update_exchange_callback = function(error,result) {
  if (!error) {
    var rates = result.data.query.results.rate;
    if (!_.isArray(rates)) {
      rates = [ rates ];
    }
    var cache = Exchange.exchange_cache;
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

Exchange.register_exchange = function(to,from) {
  from = Currency.find_definitive(from);
  to = Currency.find_definitive(to);
  var key = from.code + to.code;
  var cache = Exchange.exchange_cache;
  var force_flag = false;
  
  if (!(cache[key] && cache.hasOwnProperty(key))) {  
    cache[key] = new ReactiveVar(null);
    cache[key]._reference_counter = 1;
    force_flag = true;
  } else {
    cache[key]._reference_counter++;
  }
  Exchange.download_exchange_now(force_flag);
  return cache[key];
}

Exchange.unregister_exchange = function(to,from) {
  from = Currency.find_definitive(from);
  to = Currency.find_definitive(to);
  var key = from.code + to.code;
  var cache = Exchange.exchange_cache;
  
  if (cache[key] && cache.hasOwnProperty(key)) {
    cache[key]._reference_counter--;
    if (cache[key]._reference_counter<=0) {
      delete cache[key];
    }
  }
  Exchange.download_exchange_now();
  return true;
}

Exchange._download_exchange  = function() {
  Exchange.exec_yql(_.keys(Exchange.exchange_cache), _update_exchange_callback);
}

Exchange.download_exchange_now = function(force) {
  var exchange_cache_size = _.keys(Exchange.exchange_cache).length;
  if ((force || exchange_cache_size<=0) && Exchange._exchange_interval_id) {
    Meteor.clearInterval(Exchange._exchange_interval_id);
    delete Exchange._exchange_interval_id;
  }
  if (exchange_cache_size>0 && !Exchange._exchange_interval_id) {
    Exchange._download_exchange();
    // It is enough to perform a download every 10 minutes
    Exchange._exchange_interval_id = Meteor.setInterval(Exchange._download_exchange,
                                                        Math.round(Exchange.exchange_interval_min*60000));
  }
}

// This method allows you to create a general Money reactive variable
// (that changes when you replace the money instance all together)
Money.new_reactive_var = function(money) {
  return new ReactiveVar(money,Money.equal);
}

Money.prototype.create_reactive_var = function() {  
  return Money.new_reactive_var(this);
}

// Now to an exchange rate reactive variable

// But let's add a reactivity to the Money's value
Money.prototype.reactivate_value  = function() {  
  if (!(this._reactive && this._reactive instanceof ReactiveVar)) {
    this._reactive = new ReactiveVar(this.value);
  }
  return this._reactive;
}

Money.prototype.get_value = function() {
  return this.reactivate_value().get();
}

Money.prototype.get_str = function() {
  this.get_value();
  return this.to_str();
}

Money.prototype.set_value = function(val) {
  this.value = val;
  if (this._reactive && this._reactive instanceof ReactiveVar) {
    this._reactive.set(this.value);
  }
}

Money.prototype.set_str = function(str) {
  this.parse_str(str);
  if (this._reactive && this._reactive instanceof ReactiveVar) {
    this._reactive.set(this.value);
  }
}

// This creates a new_money which value is updated when
// the original value or exchange rate is updated
// Note that new_money is not immediatly reactive, you should
// call new_money.get_value() (or get_str() to make it reactive)
Money.prototype.exchange = function(to) {
  to = Currency.find_definitive(to);
  var rate = Exchange.register_exchange(to, this.currency);
  var self = this;
  var new_money = new Money(null,to);
  new_money.exchange_orig = self; // Mark this instance as derived from this
  
  new_money._exchange_tracker = Tracker.autorun(function() {
    var rate_val = rate.get();
    var orig_val = self.get_value();
    new_money.set_value(rate_val ? rate_val*orig_val : null);
  });
  return new_money;
}

// This allows the exchange tracker to be stopped
Money.prototype.stop_exchange_tracker = function() {
  this._exchange_tracker.stop();
}
