pragma solidity ^0.4.19;

contract Remittance  {
    
    // bytes32 represents the hash of a password, uint the funds available for whom has the right password     
    mapping (bytes32 => uint) public fonds;
    address public exchange;
    
    function Remittance(address exchangeAllowedToWithdraw) public {
        require(exchangeAllowedToWithdraw != address(0));
        exchange = exchangeAllowedToWithdraw;
    }
    /**
     * send fonds with the hash of a passwrd.
     */
    function createRemittance(bytes32 hash) public payable {
        require(msg.value > 0);
        fonds[hash] += msg.value;
    }
    
    /**
     * allow to withdraw fonds if the password hash matches a known hash
     */
    function withdrawFonds(uint pwd) public returns(bool) {
        require(msg.sender == exchange); //only carol/exchange can withdraw
        bytes32 hash = keccak256(pwd);
        uint toWithdraw = fonds[hash];
        if ( toWithdraw == 0) return false;
        fonds[hash] = 0;
        msg.sender.transfer(toWithdraw);
        return true;
    }
    
    // function calculateHash(uint pwd) public pure returns(bytes32) {
    //     return keccak256(pwd);
    // }
}
