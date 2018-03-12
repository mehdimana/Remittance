
pragma solidity ^0.4.19;

import "./Owned.sol";

/**
 * this contract can be killed (is Mortal). To prevent killing this contract while containing remittances, it has a disable switch that disable creating new remittances
 * and allows thus remittances to expire gracefully
 */
contract Remittance is Mortal {
    struct RemittanceInstanceType {
        uint ammount;
        address exchange;
        uint expiration;
        address owner;
    } 

    // bytes32 represents the hash of a password, uint the funds available for whom has the right password     
    mapping (bytes32 => RemittanceInstanceType) public funds;
    bool public disableRemmitance;
    
    event LogRemittance(address sender, address beneficiary, uint amount);
    event LogWithdrawal(address beneficiary, uint amount);

    //empty constructor
    function Remittance() public { }
    
    
    /**
     * send funds with the hash of a passwrd.
     */
    function createRemittance(bytes32 hash, address exchange, uint expirationInBlocks) public payable {
        require(!disableRemmitance);
        require(msg.value > 0);
        require(exchange != address(0));
        require(funds[hash].ammount == 0); //make sure NOT to overwrite an existing remittance with funds.
        
        RemittanceInstanceType memory remittanceInstance;
        remittanceInstance.ammount += msg.value;
        remittanceInstance.owner = msg.sender;
        remittanceInstance.exchange = exchange;
        remittanceInstance.expiration = expirationInBlocks + block.number;
        funds[hash] = remittanceInstance;
        LogRemittance(msg.sender, exchange, msg.value);
    }
    
    /**
     * disable any new disableRemmitance
     */
     function disableRemittance() public accessibleByOwnerOnly {
         disableRemmitance = true;
     }

    /**
     * enable new disableRemmitance
     */
     function enableRemittance() public accessibleByOwnerOnly {
         disableRemmitance = false;
     }    
    /**
     * allow to withdraw funds if the password hash matches a known hash
     * if remiitance not expired --> exchange can withdraw
     * else the creator of the remmittance
     */
    function withdrawFunds(string pwd) public {
        bytes32 hash = keccak256(pwd);

        uint toWithdraw = funds[hash].ammount;
        require(toWithdraw != 0); //check that the struct is not empty and/or that there are funds to withdraw
        
        if (funds[hash].expiration < block.number) { // we are past the expiration --> owner can withdraw
            require(funds[hash].owner == msg.sender); //only owner can withdraw
        } else { // before expiration --> exchange can withdraw
            require(funds[hash].exchange == msg.sender); //only carol/exchange can withdraw
        }
        
        funds[hash].ammount = 0; //prevent re-entrency
        msg.sender.transfer(toWithdraw);
        LogWithdrawal(msg.sender, toWithdraw);
    }
    
    function calculateHash(string pwd) public pure returns(bytes32) {
        return keccak256(pwd);
    }
}