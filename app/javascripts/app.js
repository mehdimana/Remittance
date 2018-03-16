const Web3 = require("web3");
const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
require("file-loader?name=../index.html!../index.html");
const $ = require("jquery");
// Not to forget our built contract
const remittanceJson = require("../../build/contracts/Remittance.json");

// Supports Mist, and other wallets that provide 'web3'.
if (typeof web3 !== 'undefined') {
    // Use the Mist/wallet/Metamask provider.
    window.web3 = new Web3(web3.currentProvider);
} else {
    // Your preferred fallback.
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:9545')); 
}

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.version, { suffix: "Promise" });

const Remittance = truffleContract(remittanceJson);
Remittance.setProvider(web3.currentProvider);

var logWithdrawalEvent; 


window.addEventListener('load', function() {
    return web3.eth.getAccountsPromise()
        .then(accounts => {
            if (accounts.length == 0) {
                $("#balance").html("N/A");
                throw new Error("No account with which to transact");
            }
            window.account = accounts[0];

            //update account dropdown
            $("#account-select").empty();
            for(i=0; i<accounts.length; i++) {
                $("#account-select").append($("<option></option>")
                                   .attr("value", accounts[i]).text(i + ": " + accounts[i]));
                $("#exchange-select").append($("<option></option>")
                                   .attr("value", accounts[i]).text(i + ": " + accounts[i]));
                $("#hash-select").append($("<option></option>")
                                   .attr("value", accounts[i]).text(i + ": " + accounts[i]));
            }
            $("#account-select").change(function(){
                updateBalance($(this).val());
            });
            // console.log("Account:", window.account);
            return web3.version.getNetworkPromise();
        })
        .then(network => {
            console.log("Network:", network.toString(10));
            return web3.eth.getBalancePromise(window.account);
        })
        .then(balance => $("#balance").html(balance.toString(10)))
        // We wire it when the system looks in order.
        .then(() => $("#disable-contract").click(disableContract))
        .then(() => $("#enable-contract").click(enableContract))
        .then(() => $("#kill-contract").click(killContract))
        .then(() => $("#calculate-hash").click(calculateHash))
        .then(() => $("#create-remittance").click(createRemittance))      
        .then(() => $("#withdraw").click(withdraw))
        .then(() => watchEvents())
        // Never let an error go unlogged.
        .catch(console.error);
});

const watchEvents = function() {
  var deployed;
  return Remittance.deployed()
         .then( deploy => {
          deployed = deploy;
            return  deploy.LogWithdrawal({from: account});
         }).then( event => {
            watchEvent(event);
            return deployed.LogRemittance({from: account});
         }).then( event => {
            watchEvent(event);
            return deployed.LogRemittanceEnabled({from: account});
         }).then( event => {
            watchEvent(event);
         });
}

const watchEvent = function(event) {
   event.watch(function(err, result) {
    if (err) {
      console.log(err)
      return;
    }
    console.log(result.event);
    console.log(result.args);
  })
}

const updateBalance = function(accountSelected) {
  return web3.eth.getBalancePromise(accountSelected)
                 .then(balance => {
                    $("#balance").html(balance.toString(10))
                 }).catch(console.error);
};

const withdraw = function() {
  return Remittance.deployed()
         .then( deploy => {
            return deploy.withdrawFunds.sendTransaction($("input[name='pwd']").val(),
                                           {from: $("#account-select").val()});
         }).then(txHash => {
          updateBalance($("#account-select").val());
          return web3.eth.getTransactionReceiptPromise(txHash);
        }).then(txObject => {
          if (txObject.status === "0x01") {
            $("#status").html("withdrawal successsfuly.");
          } else {
            $("#status").html("error withdrawing.");
            console.error(txObject);
          }
          
         }).catch(console.error);
}

const createRemittance = function() {
  return Remittance.deployed()
         .then( deploy => {
            return deploy.createRemittance($("input[name='hash']").val(),
                                           $("#exchange-select").val(),
                                           $("input[name='expiration']").val(),
                                            {from: $("#account-select").val(), 
                                             value: $("input[name='amount']").val(),
                                             gas: 5000000});
         }).then(txObject => {
          if (txObject.receipt.status === "0x01") {
            $("#status").html("Remittance created successsfuly.");
            console.log(txObject.logs[0].args);
          } else {
            $("#status").html("error creating remittance.");
            console.error(txObject);
          }
          updateBalance($("#account-select").val());
         }).catch(console.error);
}

const calculateHash = function() {
  return Remittance.deployed()
         .then( deploy => {
          console.log("----")
            return deploy.calculateHash.call($("input[name='testHash']").val(), $("#hash-select").val());
         }).then(hash => {
          $("#status").html(hash);
         }).catch(console.error);
}

const disableContract = function() {
  return Remittance.deployed()
         .then( deploy => {
            return deploy.disableRemittance({from: $("#account-select").val()})
         }).then(txObject => {
          if (txObject.receipt.status === "0x01") {
            $("#status").html("contract disable successsfuly.");
          } else {
            $("#status").html("error disabling contract.");
            console.error(txObject);
          }
          updateBalance($("#account-select").val());
         }).catch(console.error);
}

const enableContract = function() {
  return Remittance.deployed()
         .then( deploy => {
            return deploy.enableRemittance({from: $("#account-select").val()})
         }).then(txObject => {
          if (txObject.receipt.status === "0x01") {
            $("#status").html("contract enabled successsfuly.");
          } else {
            $("#status").html("error enabling contract.");
            console.error(txObject);
          }
          updateBalance($("#account-select").val());
         }).catch(console.error);
}

const killContract = function() {
  return Remittance.deployed()
         .then( deploy => {
            return deploy.kill({from: $("#account-select").val()})
         }).then(txObject => {
          if (txObject.receipt.status === "0x01") {
            $("#status").html("contract killed successsfuly.");
          } else {
            $("#status").html("error killing contract.");
            console.error(txObject);
          }
          updateBalance($("#account-select").val());
         }).catch(console.error);
}
