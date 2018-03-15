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
        // Never let an error go unlogged.
        .catch(console.error);
});

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
         }).then(txObject => {
          if (txObject.receipt.status === "0x01") {
            $("#status").html("withdrawal successsfuly.");
            console.log(txObject.logs[0].args);
          } else {
            $("#status").html("error withdrawing.");
            console.error(txObject);
          }
          updateBalance($("#account-select").val());
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
            return deploy.calculateHash.call($("input[name='testHash']").val());
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
/*
const sendCoin = function() {
    // Sometimes you have to force the gas amount to a value you know is enough because
    // `web3.eth.estimateGas` may get it wrong.
    const gas = 300000; let deployed;
    // We return the whole promise chain so that other parts of the UI can be informed when
    // it is done.
    return Remittance.deployed()
        .then(_deployed => {
            deployed = _deployed;
            // We simulate the real call and see whether this is likely to work.
            // No point in wasting gas if we have a likely failure.
            return _deployed.sendCoin.call(
                $("input[name='recipient']").val(),
                // Giving a string is fine
                $("input[name='amount']").val(),
                { from: window.account, gas: gas });
        })
        .then(success => {
            if (!success) {
                throw new Error("The transaction will fail anyway, not sending");
            }
            // Ok, we move onto the proper action.
            // .sendTransaction so that we get the txHash immediately while it 
            // is mined, as, in real life scenarios, that can take time of 
            // course.
            return deployed.sendCoin.sendTransaction(
                $("input[name='recipient']").val(),
                // Giving a string is fine
                $("input[name='amount']").val(),
                { from: window.account, gas: gas });
        })
        // We would be a proper `txObject` if we had not added `.sendTransaction` above.
        // Oh well, more work is needed here for our user to have a nice UI.
        .then(txHash => {
            $("#status").html("Transaction on the way " + txHash);
            // Now we wait for the tx to be mined. Typically, you would take this into another
            // module, as in https://gist.github.com/xavierlepretre/88682e871f4ad07be4534ae560692ee6
            const tryAgain = () => web3.eth.getTransactionReceiptPromise(txHash)
                .then(receipt => receipt !== null ?
                    receipt :
                    // Let's hope we don't hit the max call stack depth
                    Promise.delay(1000).then(tryAgain));
            return tryAgain();
        })
        .then(receipt => {
            if (receipt.logs.length == 0) {
                console.error("Empty logs");
                console.error(receipt);
                $("#status").html("There was an error in the tx execution");
            } else {
                // Format the event nicely.
                console.log(deployed.Transfer().formatter(receipt.logs[0]).args);
                $("#status").html("Transfer executed");
            }
            // Make sure we update the UI.
            return deployed.getBalance.call(window.account);
        })
        .then(balance => $("#balance").html(balance.toString(10)))
        .catch(e => {
            $("#status").html(e.toString());
            console.error(e);
        });
};
*/