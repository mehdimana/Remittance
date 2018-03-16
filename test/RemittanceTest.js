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

	describe("test withdrawal", () => {
		var pwd = "123456789";
		var hash;
		var blockNumber;

		beforeEach(function() {
			return Remittance.deployed().then( () => {
				return contractInstance.calculateHash(pwd, exchange1);
			}).then(hashCalculatedByContract => {
				hash = hashCalculatedByContract;
				return contractInstance.createRemittance(hash, exchange1, 2, {from: owner, value: 100});
			}).then(function(txObject) {
				assert.strictEqual("0x01", txObject.receipt.status);
				assert.strictEqual("LogRemittance", txObject.logs[0].event);
				assert.strictEqual(owner, txObject.logs[0].args.sender);
				assert.strictEqual(exchange1, txObject.logs[0].args.beneficiary);
				assert.strictEqual(100, txObject.logs[0].args.amount.toNumber());
				return web3.eth.getBlockNumberPromise();
			}).then( blockNumberReturned => {
				blockNumber = blockNumberReturned;
				return contractInstance.funds(hash, {from: owner});
			}).then(function(remittanceInstance) {
				assert.strictEqual('100', remittanceInstance[0].toString(10), "funds not set properly after Remittance");
				assert.strictEqual(2+blockNumber, remittanceInstance[1].toNumber(), "expiration not set properly after Remittance");
				assert.strictEqual(owner, remittanceInstance[2], "owner not set properly after Remittance");
			})
		})

		it("should create a remittance and withdraw properly", () => {			
			
			return contractInstance.withdrawFunds(pwd, {from: exchange1}).then( txObject => {
				assert.strictEqual("0x01", txObject.receipt.status);
				assert.strictEqual(exchange1, txObject.logs[0].args.beneficiary);
				assert.strictEqual(100, txObject.logs[0].args.amount.toNumber());
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
			return contractInstance.recoverFunds(hash, {from: owner}).catch( error => {
				// ok
			});
		});

		it("should allow owner to retreive funds after deadline", () => {
			return contractInstance.enableRemittance({from: owner}).then(() => { //create transaction to go over deadline
				return contractInstance.enableRemittance({from: owner}); //create transaction to go over deadline
			}).then( () => {
				return contractInstance.recoverFunds(hash, {from: owner}); 
			}).then( txObject => {
				assert.strictEqual("0x01", txObject.receipt.status);
				return web3.eth.getBalancePromise(contractInstance.address);
			}).then( balance => {
				assert.strictEqual(0, balance.toNumber(), "balance of the contract wrong");
			})
		});

	});

	describe("remittance enablement/disablement", function() {
		var pwd = "123456789";
		var hash = web3.sha3(pwd, exchange1);

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
			var hash = web3.sha3(pwd, exchange1);
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