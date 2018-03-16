
pragma solidity ^0.4.19;

import "./Owned.sol";

/**
 * this contract can be killed (is Mortal). To prevent killing this contract while containing remittances, it has a disable switch that disable creating new remittances
 * and allows thus remittances to expire gracefully
 */
contract Remittance is Mortal {
    struct RemittanceInstanceType {
        uint ammount;
        uint expiration;
        address owner;
    } 

    // bytes32 represents the hash of a password, uint the funds available for whom has the right password     
    mapping (bytes32 => RemittanceInstanceType) public funds;
    bool public disableRemmitance;
    
    event LogRemittance(address sender, address beneficiary, uint amount);
    event LogWithdrawal(address beneficiary, uint amount);
    event LogRemittanceEnabled(bool enabled);

    //empty constructor
    function Remittance() public { }
    
    
    /**
     * send funds with the hash of a passwrd.
     * @param hash hash calculated by the function calculateHash. 
     * @param exchange only used for emitting an event
     * @param expirationInBlocks expiration of this Remittance
     */
    function createRemittance(bytes32 hash, address exchange, uint expirationInBlocks) public payable {
        require(!disableRemmitance);
        require(msg.value > 0);
        require(exchange != address(0));
        require(funds[hash].owner == address(0)); //make sure this hash has never been used before (thus pwd unknown)
                                                    //we use the owner address that should be 0 if the row doess not exist.
        
        RemittanceInstanceType memory remittanceInstance;
        remittanceInstance.ammount += msg.value;
        remittanceInstance.owner = msg.sender;
        remittanceInstance.expiration = expirationInBlocks + block.number;
        funds[hash] = remittanceInstance;
        LogRemittance(msg.sender, exchange, msg.value);
    }
    
    /**
     * disable any new disableRemmitance
     */
     function disableRemittance() public accessibleByOwnerOnly {
         disableRemmitance = true;
         LogRemittanceEnabled(!disableRemmitance);
     }

    /**
     * enable new disableRemmitance
     */
     function enableRemittance() public accessibleByOwnerOnly {
         disableRemmitance = false;
         LogRemittanceEnabled(!disableRemmitance);
     }    
     
    /**
     * allow to withdraw funds if the password hash matches a known hash
     * if remiitance not expired --> exchange can withdraw
     * else the creator of the remmittance
     * @param pwd a concatenation of bob's and carol's password
     */
    function withdrawFunds(bytes32 pwd) public {
        //Hash is calculated using the pwd and the exchange's address --> garantiess that only the exchange is the sender.
        bytes32 hash = calculateHash(pwd, msg.sender);

        uint toWithdraw = funds[hash].ammount;
        require(toWithdraw != 0); //check that the struct is not empty and/or that there are funds to withdraw
        
        require(funds[hash].expiration >= block.number); // we are not past the expiration --> exchange/carol can withdraw

        funds[hash].ammount = 0; //prevent re-entrency
        LogWithdrawal(msg.sender, toWithdraw);
        msg.sender.transfer(toWithdraw);
    }
    
    /**
     * allow to recover the funds by owner after expiration 
     * @param hash hash as calculated by the function calculateHash
     */
    function recoverFunds(bytes32 hash) public {
        uint toWithdraw = funds[hash].ammount;
        require(toWithdraw != 0); //check that the struct is not empty and/or that there are funds to withdraw
        
        require(funds[hash].expiration < block.number); // we are past the expiration --> owner can withdraw
        require(funds[hash].owner == msg.sender); //only owner can withdraw
       
        funds[hash].ammount = 0; //prevent re-entrency
        LogWithdrawal(msg.sender, toWithdraw);
        msg.sender.transfer(toWithdraw);
    }
    
    function calculateHash(bytes32 pwd, address exchange) public pure returns(bytes32) {
        return keccak256(pwd, exchange);
    }
}