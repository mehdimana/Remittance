Promise = require("bluebird");
Promise.promisifyAll(web3.eth, { suffix: "Promise" });

var Remittance = artifacts.require("./Remittance.sol");

contract('Remittance', function(accounts) {
	var contractInstance;
	var owner = accounts[0];
	var exchange1 = accounts[1];
	var exchange2 = accounts[2];
	var other = accounts[3];

	beforeEach(function() {
		return Remittance.new({from: owner})
			.then(function(instance){
				contractInstance = instance;
			})
	})

	it("test hash", () => {
		var pwd = "12345678";
		var hash = web3.sha3(pwd)
		return Remittance.deployed().then( () => {
			return contractInstance.calculateHash.call(pwd, {from: exchange1});
		}).then(function(hashFromContract) {
			//console.log(hash + "----" + hashFromContract);
			assert.strictEqual(hash, hashFromContract, "hashes do not match");
		});
	})

	describe("test withdrawal", () => {
		var pwd = "123456789";
		var hash = web3.sha3(pwd);
		var blockNumber;

		beforeEach(function() {
			return Remittance.deployed().then( () => {
				return contractInstance.createRemittance(hash, exchange1, 2, {from: owner, value: 100});
			}).then(function(txObject) {
				assert.strictEqual("0x01", txObject.receipt.status);
				return web3.eth.getBlockNumberPromise();
			}).then( blockNumberReturned => {
				blockNumber = blockNumberReturned;
				return contractInstance.funds(hash, {from: owner});
			}).then(function(remittanceInstance) {
				assert.strictEqual('100', remittanceInstance[0].toString(10), "funds not set properly after Remittance");
				assert.strictEqual(exchange1, remittanceInstance[1], "exchange address not set properly after Remittance");
				assert.strictEqual(2+blockNumber, remittanceInstance[2].toNumber(), "expiration not set properly after Remittance");
				assert.strictEqual(owner, remittanceInstance[3], "owner not set properly after Remittance");
			})
		})

		it("should create a remittance and withdraw properly", () => {			
			
			return contractInstance.withdrawFunds(pwd, {from: exchange1}).then( txObject => {
				assert.strictEqual("0x01", txObject.receipt.status);
			});
		});

		it("should only allow exchange to withdraw", () => {
			return contractInstance.withdrawFunds(pwd, {from: other}).then(function(success) {	
				assert(false, "transaction should not succeed.");
			}).catch(error => {
				//ok
				//console.log(error.toString().indexOf("VM Exception while processing transaction"));
			})
		});

		it("should not allow owner to retreive funds before deadline", () => {
			return contractInstance.withdrawFunds(pwd, {from: owner}).catch( error => {
				// ok
			});
		});

		it("should allow owner to retreive funds after deadline", () => {
			return contractInstance.enableRemittance({from: owner}).then(() => { //create transaction to go over deadline
				return contractInstance.enableRemittance({from: owner}); //create transaction to go over deadline
			}).then( () => {
				return contractInstance.withdrawFunds(pwd, {from: owner}); 
			}).then( txObject => {
				assert.strictEqual("0x01", txObject.receipt.status);
			});
		});

	});

	describe("remittance enablement/dissablement", function() {
		var pwd = "123456789";
		var hash = web3.sha3(pwd);

		it ("should disable properly", () => {			
			return contractInstance.disableRemittance({from: owner}).then(() => { 
				return contractInstance.createRemittance(hash, exchange1, 2, {from: owner, value: 100});
			}).then(() => {
				assert(false, "createRemittance should not succeed.")
			}).catch(error => {
				//ok
			})
		});

		it ("should enable properly", () => {
			var pwd = "123456789";
			var hash = web3.sha3(pwd);
			return contractInstance.disableRemittance({from: owner}).then(() => { 
				return contractInstance.enableRemittance({from: owner});
			}).then(() => {
				return contractInstance.createRemittance(hash, exchange1, 2, {from: owner, value: 100});			
			}).then(txObject => {
				assert.strictEqual("0x01", txObject.receipt.status);				
			}).catch(error => {
				console.log(error);
				assert(false, "createRemittance should not succeed.")				
			})
		});

		it ("should not allow but owner to disable", () => {
			return contractInstance.disableRemittance({from: other}).then(() => { 
				assert(false, "createRemittance should not succeed.")
			}).catch(error => {
				//ok
				//console.log(error);
			})
		});

		it ("should not allow but owner to enable", () => {
			return contractInstance.enableRemittance({from: other}).then(() => { 
				assert(false, "createRemittance should not succeed.")
			}).catch(error => {
				//ok
				//console.log(error);
			})
		});
	})

});