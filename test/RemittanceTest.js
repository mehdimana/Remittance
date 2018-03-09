var Remittance = artifacts.require("./Remittance.sol");

contract('Remittance', function(accounts) {
	var contract;
	var owner = accounts[0];
	var exchange = accounts[1];
	var other = accounts[2];

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

	// it("test hash", () => {
	// 	var pwd = "12345678";
	// 	var hash = web3.sha3(pwd)
	// 	return Remittance.deployed().then( () => {
	// 		return contract.calculateHash.call(pwd, {from: exchange});
	// 	}).then(function(hashFromContract) {
	// 		console.log(hash + "----" + hashFromContract);
	// 	});
	// })

	it("should remit and withdraw properly", () => {
		var pwd = "123456789";
		var hash = web3.sha3(pwd);
		return Remittance.deployed().then( () => {
			return contract.createRemittance.sendTransaction(hash, {from: owner, value: 100});
		}).then(function(txHassh) {
			return contract.fonds.call(hash, {from: owner});
		}).then(function(amount) {
			assert.strictEqual('100', amount.toString(10), "fonds not sset properly after Remittance");
			return contract.withdrawFonds.call(pwd, {from: exchange});
		}).then(function(success) {
			assert.strictEqual(true, success, "withdrawal was not successfull.")
		})
	});

	it("should only allow exchange to withdraw", () => {
		var pwd = "123456789";
		var hash = web3.sha3(pwd);
		return Remittance.deployed().then( () => {
			return contract.createRemittance.sendTransaction(hash, {from: owner, value: 100});
		}).then(function(txHassh) {
			return contract.fonds.call(hash, {from: owner});
		}).then(function(amount) {
			assert.strictEqual('100', amount.toString(10), "fonds not sset properly after Remittance");
			return contract.withdrawFonds.call(pwd, {from: other});
		}).then(function(success) {	
			assert(false, "transaction should not succeed.");
		}).catch(error => {
			//ok
			console.log(error.toString().indexOf("VM Exception while processing transaction"));
		})
	});

	it("should fail on second withdraw", () => {
		var pwd = "123456788";
		var hash = web3.sha3(pwd);
		var balanceInitial;
		var balanceBefore;
		var balanceAfter;
		return Remittance.deployed().then( () => {
			return web3.eth.getBalance(exchange);
		}).then(function(balanceExch) {
			balanceInitial = balanceExch;
			return contract.createRemittance.sendTransaction(hash, {from: owner, value: 10000000000000000});
		}).then(function(txHassh) {
			return contract.fonds.call(hash, {from: owner});
		}).then(function(amount) {
			return contract.withdrawFonds(pwd, {from: exchange});
		}).then(function(txObject) {
			assert.strictEqual("0x01", txObject.receipt.status, "withdrawal was not successfull.")
			return web3.eth.getBalance(exchange);
		}).then(function(balanceExch) {
			balanceBefore = balanceExch;
			assert(balanceInitial < balanceBefore, "exchange did not receive ethers");
			return contract.withdrawFonds(pwd, {from: exchange});
		}).then(function(txObject) {
			assert.strictEqual("0x01", txObject.receipt.status, "withdrawal was not successfull.")
			return web3.eth.getBalance(exchange);
		}).then(function(balanceExch) {
			balanceAfter = balanceExch;
			assert(balanceAfter <= balanceBefore, "Should not get more ether the second time withdrawal");
		})
	});	
});