# currency
An advanced package for handling currencies formats and support for client side reactive currency conversion based on Yahoo Finance (yql).

## Installation
```
meteor add ronenm:currency
```

## The Currency class
Currency class is used to hold a currency definition.
Currency is available to both client and server

```javascript

// Create a single currency
new Currency('United States', 'USD', '$', '%{symbol}%<value>.2f', true);

// or
new Currency({
  country: 'United States',                                                            
  code: 'USD',
  symbol: '$',
  format: '%{symbol}%<value>.2f',
  default_flag: true
};


// Create multiple currencies
Currency.create_multiple(<array_of_options>);

```

When a currency is created, it is being held in an internal cache so there is no need to hold it in a variable.

### The Currency options

* **country**: The country of the currency.
* **code**: The ISO code of the currency (the ISO of the country name + a currency character).
* **symbol**: The Symbol used for the currency (you can use utf8 to provide the symbol).
* **format**: The format uses a ruby style formatting: `%{<option>}` show a specific option (usually the symbol), `%<value>.<d>f` is used to format the value of the money object. <d> should include the number of decimal points.
* **default_flag**: Optional, used to mark the currency as the default currency (override the previous default currency).

### Currency global functions

All Currency function throws Meter.Error in case of an error!

```javascript

// Find a currency by a code (you can use also two characters country code)
Currency.find_by_code('USD');       // Find US Dollar
Currency.find_by_code('GB');        // Will return the GBP (Great Britain Pound) currency object

// Used by serveral of the functions to decipher their currency inputs
Currency.find_definitive();         // Returns the default currency (if no default throws an error)
Currency.find_definitive('EU');     // Will return the EUR currency object (if you defined one)
Currency.find_definitive(currency); // Return the currency itself

// Compare two currencies objects
Currency.equal(c1,c2);   // Return true if the codes of currency c1 and currency c2 is the same

// Currencies highlighting support used for option lists for selection of currencies
Currency.set_highlight('USD','GBD','EUR');  // Sets the currencies codes to highlight (no checking is done on the names)
Currency.append_highlight('CAD');           // Add additional currency/ies to the highlighted list

// Get a list of currencies
Currency.find_all();      // Get the list of all currencies in the system
Currency.find_all(true);  // Get only the highlighted currencies
Currency.find_all(false); // Get only the non-highlighted currencies

```

**Note**: Currency support multiple currencies per country. If such case occurs. The `Currency.find_by_code(country_code)` will return a list of currencies and
`Currency.find_definitive(country_code)` will throw an error.

### Currency object methods

```javascript

var currency = Currency.find_by_code("AUD");
currency.to_str(145.3);         // Returns "$145.30"
currency.prase_str("$35.5");    // Returns 35.5
currency.prase_str("QWE35.50"); // Returns 35.5 (ignore irrelevant strings)
currency.prase_str("$-35.5");   // Returns 35.5 (ignores minus signs)

```

## Exchange name space
The Exchange name space is used to support querying the web for an exchange rates between currencies pair/s.
Currently Exchange uses Yahoo Query to query for exchange rates but this name space can be expanded to support other currencies.

Exchange supports can be used both on the client and on the server but the usage is a bit different. This section will concentrate on the common and server only operations.

See the reactivity section for explanation on using Exchange on the client.

### The `Exchange` function

Use the exchange function to find an exchange rate/s from a set of origin currencies to a set of target currencies.

**Note** that the order of the parameters to the functions is `to` and than `from`, since the `from` (origin) currency may be the default currency.

```javascript

// Synchronous calls available only on the server
var rate = Exchange('EUR');  // Return the yql rate record of the exchange from the default currency to Euro.
var rates = Exchange(['EUR','CAD','ILS']); // Return a list of yql rate records of the exchange from the default
                                           // currency to Euro, Canadian Dollars and Israeli Sheqel
var rates = Exchange(['USD','EUR'],['JPY', 'ILS']); // Returns all exchange rates 'JPYUSD', 'JPYEUR','ILSUSD' and 'ILSEUR'.

// Asynchronous calls available on the server and client
var exchange_callback = function(error, result) {};  // This is the callback prorotype
                                                     // result may include a single exchange record or
                                                     // a list of exchange records
                                    
// The same examples as above with a callback                 
Exchange('EUR',exchange_callback);                        // exchange rate from default currency to single currency
Exchange(['EUR','CAD','ILS'],exchange_callback);          // exchange rates from default currency to multiple currencies
Exchange(['USD','EUR'],['JPY', 'ILS'],exchange_callback); // exchange rates between multiple currencies

```

## Money Class

The Money class is used to hold a specific value in a specific currency.
The Money class is available on both server and client but in the client it can become reactive.

```javascript

var def_money = new Money(35.5);        // Creata a default money object
var my_money = new Money(100.4,'USD');  // Use a money code (you can also use the coutry code)
var m2 = new Money('$100.403','USD');   // Uses `Currency.parse_str` for parsing the value
my_money.to_str();                      // "$100.40"
m2.to_str();                            // "$100.40"
Money.equal(my_money,m2);               // Returns true since Money uses the scale defined in the format
                                        // to round 100.403 to 100.4
                                        
var m3 = new Money(100.4,'CAD');
Money.equal(m2,m3);                     // Returns false since m2 and m3 are of different currencies

```

### The **server** only exchange method
The `exchange` method on the server performs an immediate call the `Exchange` function and creates a new Money object.

```javascript

var def_money = new Money(100,'USD');
var exchanged_money = def_money.exchange('JPY'); // Create new money object with the exchanged rate to Yen

```

## Reactivity: Supporting exchange rates on the client

This package fully supports reactivity for Money objects and exchange rates. It also includes some templates that you can use in you Meteor application.
Reactivity allows you to avoid network request to your server by allowing the client to connect directly to an exchange rates server (in our case Yahoo Query server).

### General setup

Since the exchange rates are used mainly for estimation (since the final real exchange depends on the money processor exchange rate and on commissions), we can update the exchange rates infrequently.

The default of the package is to update every 10 minutes. You can change it by modifying the `Exchange.exchange_interval_min` variable:

```javascript

Exchange.exchange_interval_min = 1;  // Set the query interval to 1 minute

```

### Usage flow

Following code sample includes the usage flow of the reactive support of the Currency package.
The next section will describe what's going on behind the scenes.

```javascript

// The following code is available only on the client

// Create an empty ReactiveVar with the Money's equal function
var money_var = Money.new_reactive_var();

// Set a Money object to the ReactiveVar
var money = new Money(150,'CAD');
money_var.set(money);

// The Client's exchange methods create a new money object that tracks
// the change of the original money as well as the exchange rate change
var exchanged_money = def_money.exchange('JPY');

// Reactively setting the value of the original money
// If you want to change the currency you must create a new money object
// and set it to the money_var and recreate the exchange tracking
money.set_value(145);
money.set_str("$566");

// Reactively getting the value of a money object
exchanged_money.get_value();  // Returns a number (or null if the value not available yet)
exchanged_money.get_str();    // Returns a formatted string (or empty string if value not available yet)

// Stop tracking the exchange rate and the changes to the value of the original
// money object.
// Use it when you discard the original money object
exchanged_money.stop_exchange_tracker();

```

### Behind the scenes

On the client, when the exchange method is called on the original money object it performs two actions:

1. Register the exchange pairs for exchange rate tracking, using `Exchange.register_exchange`. This function returns a reactive exchange variable (either existing or newly created).

2. Start a `Tracker.autorun` that calculate the value based on the value of the original money object and the exchange rate (both reactive).

The Exchange package **on the client**, once any exchange pair has been registered runs an update function in the interval defined by `Exchage.exchange_interval_min`
variable.

Following snippet includes the low-level functions used for reactivity:

```javascript

var rate_var = Exchange.register_exchange('USD','JPY'); // Register the JPYUSD pair for querying by the Exchange package
                                                        // If the pair already exist increase its reference counter
                                                        // Returns a ReactiveVar
                                                        
Exchange.unregister_exchange('USD','JPY');   // Unregister the JPYUSD pair from querying.
                                             // This does not necessary remove the pairs from the query list
                                             // Since we use reference counter 

// Even though it say 'now' download_exchange_now not necessary performs the exchange update immediately
// If you want it to be performed immediately (still asynchronously) use the second form
Exchange.download_exchange_now();     // Runs the download exchange if it is not running and redo it in Exchage.exchange_interval_min intervals
Exchange.download_exchange_now(true); // Runs the download exchange immediately and redo it in Exchage.exchange_interval_min intervals
                                      // (If there is already a setInterval running it will stop it and create new setInterval)

```

## Templates and Helpers

The package also includes few templates and helpers

* `currencyInfo`: Displays an info about a currency. It works in the context of an Currency object and you can also add a `flag_url` helper (or add it as an attribute on the Currency object).
* `currencySelector`: Create a select element with all the currencies (with highlighted currencies first). It uses internally the currencyInfo template so it can show also flags.
* `showMoney`: Just show the reactive value (`money.get_str()`) of a Money object.

## Example:

Following is the html and javascript for a application that performs exchance converssion on the client.
It uses the OfferJar (InKomerce) API from `ronenm:offerjar-api` to create the list of currencies.

```html

<head>
  <title>Money Exchange Test</title>
</head>

<body>
  <h1>Money Exchange Test</h1>

  {{> fromMoney }}
  {{> toMoney }}
</body>

<template name="fromMoney">
  <h3>From:</h3>
  {{#if money}}
    {{#with money}}
      {{#with currency}}
        {{>currencySelector}}
      {{/with}}
      <form class="set-from-form">
        <input type="text" name="from" value="{{get_str}}" placeholder="Type the value that you would like to convert" />
      </form>
    {{/with}}
  {{/if}}
</template>

<template name="toMoney">
  <h3>To:</h3>
  {{#if money}}
    {{#with money}}
      {{#with currency}}
        {{>currencySelector}}
      {{/with}}
      {{>showMoney}}
    {{/with}}
  {{/if}}
</template>

```

```javascript

if (Meteor.isClient) {
  Session.set("currencyReady",false);
  
  // This app will query for exchange rate every 2 minutes 
  Exchange.exchange_interval_min = 2;
  
  // We start with two empty Money ReactiveVars
  var from = Money.new_reactive_var();
  var to = Money.new_reactive_var();
  
  // Make US Dollars, Euro and GB Punds the main currencies
  Currency.set_highlight('USD','EUR','GBP');

  // Connect to OfferJar/InKomerce Global resource
  // This is the only resource available to clients
  var global = new OfferJar.Global();
  
  // Query the Global resource for list of all currencies
  // and set them up in the Currency system
  global.get_currencies(function(error,result) {
    if (!error) {
      Currency.create_multiple(result.data);
      Session.set("currencyReady",true);
    }
  });
  
  // An autorun to setup the application after currencies are ready
  Tracker.autorun(function(c) {
    if (Session.get("currencyReady")) {
      from.set(new Money(null,"USD"));
      to.set(from.get().exchange("USD"));
      c.stop();
    }
  });
  
  Template.fromMoney.helpers({
    money: function() {
      return from.get();
    }
  });
  
  Template.fromMoney.events({
    'change select': function(event) {
      var new_cur = $(event.target).val();
      if (new_cur != this.code) {
        // When there is a change in currnecy we must create a new
        // original Money object and new exchanged money object
        var cur_money = from.get();
        from.set(new Money(cur_money.value,new_cur));
        
        var to_cur_money = to.get();
        if (to_cur_money instanceof Money) {
          to_cur_money.stop_exchange_tracker(); // No need to track the old exchange anymore
          // Create a new exchange tracking
          to.set(from.get().exchange(to_cur_money.currency));
        }
      }
    },
    'blur input[name="from"]': function(event) {
      // Set the value (it is automatically tracked)
      from.get().set_str($(event.target).val());
    }
  });
  
  Template.toMoney.helpers({
    money: function() {
      return to.get();
    }
  });
  
  Template.toMoney.events({
    'change select': function(event) {
      var new_cur = $(event.target).val();
      if (new_cur != this.code) {
        // When the currnecy change we must create a new Money object
        var cur_money = to.get();
        if (cur_money instanceof Money) {
          cur_money.stop_exchange_tracker(); // Make sure to stop the unnecessary tracking
          to.set(from.get().exchange(new_cur));
        }
      }
    }
  });
}


```

## License
MIT
