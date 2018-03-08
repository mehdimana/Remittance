var Remittance = artifacts.require("./Remittance.sol");

contract('Remittance', function(accounts) {
	var contract;
	var owner = accounts[0];
	var exchange = accounts[1];

	beforeEach(function() {
		return Remittance.new(exchange, {from: owner})
			.then(function(instance){
				contract = instance;
			})
	})


	it("should initialize properly", () => {
		return Remittance.deployed().then( () => {
			return contract.exchange.call({from: owner});
		}).then(function(exchangeAdrs) {
			assert.strictEqual(exchange, exchangeAdrs, "Exchange wass not initialized properly");
		})
	});

	it("should fail if exchange is not defined", async () => {
		try {
	      await Remittance.new({from: owner});
	      assert.fail('should have thrown before');
	    } catch(error) {
			console.log(error.toString());
	    }
	});

	it("should remit and withdraw properly", () => {
		var pwd = 123456789;
		var hash = web3.sha3(pwd);
		return Remittance.deployed().then( () => {
			return contract.createRemittance.sendTransaction(hash, {from: owner, value: 100});
		}).then(function(txHassh) {
			return contract.fonds.call(hash, {from: owner});
		}).then(function(amount) {
			assert.strictEqual('100', amount.toString(10), "fonds not sset properly after Remittance");
			return contract.withdrawFonds.call(pwd, {from: exchange});
		}).then(function(success) {
			console.log("---"+success);
			assert.strictEqual(true, success, "withdrawal was not successfull.")
		})
	});
});