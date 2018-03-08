var Remittance = artifacts.require("./Remittance.sol");

module.exports = function(deployer) {
	var exchangeAddress = 
  deployer.deploy(Remittance, "0xf17f52151ebef6c7334fad080c5704d77216b732");
};
