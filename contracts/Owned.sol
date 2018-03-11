pragma solidity ^0.4.19;

contract Owned {
    address owner;
    
    function Owned() public {
        owner = msg.sender;
        assert(owner != address(0));
    }
    
    modifier accessibleByOwnerOnly {
        require(owner == msg.sender);
        _;
    }
}

contract Mortal is Owned {
    function kill() public {
        require(msg.sender == owner);
        selfdestruct(owner);
    }
}

contract Expirable {
    uint duration;
    uint deadLine;
    
    function Expirable(uint durationInBlock) public {
        duration = durationInBlock;
        deadLine = block.number + duration;
    }
    
    modifier expirable() {
        require(deadLine < block.number);
        _;
    }
}