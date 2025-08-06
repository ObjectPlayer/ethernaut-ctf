import { ethers } from "hardhat";

/**
 * Script to solve the Level 0: Hello Ethernaut challenge
 * This script calls each method in sequence to solve the challenge
 * Usage: 
 * npx hardhat run scripts/level-00-hello/solve-hello-ethernaut.ts --network sepolia
 * CONTRACT_ADDRESS=0xYourAddress npx hardhat run scripts/level-00-hello/solve-hello-ethernaut.ts --network sepolia
 */
async function main() {
  // Get the contract address from environment variable or use default
  const defaultAddress = "0x946D0852932CFCA49879d3490bA90bfa417B6319";
  const contractAddress = process.env.CONTRACT_ADDRESS || defaultAddress;
  
  console.log(`Connecting to Instance contract at address: ${contractAddress}`);
  
  // Get the contract factory and attach to the deployed contract
  const Instance = await ethers.getContractFactory("Instance");
  const instance = Instance.attach(contractAddress);
  
  try {
    // Step 1: Call info() to get the first hint
    console.log("\n--- Step 1: Calling info() ---");
    const info = await instance.info();
    console.log(`Hint: ${info}`);
    
    // Step 2: Call info1() as suggested by info()
    console.log("\n--- Step 2: Calling info1() ---");
    const info1 = await instance.info1();
    console.log(`Hint: ${info1}`);
    
    // Step 3: Call info2("hello") as suggested by info1()
    console.log("\n--- Step 3: Calling info2('hello') ---");
    const info2 = await instance.info2("hello");
    console.log(`Hint: ${info2}`);
    
    // Step 4: Get infoNum value
    console.log("\n--- Step 4: Getting infoNum ---");
    const infoNum = await instance.infoNum();
    console.log(`infoNum: ${infoNum}`);
    
    // Step 5: Call info42() as suggested by infoNum
    console.log(`\n--- Step 5: Calling info${infoNum}() ---`);
    const info42 = await instance.info42();
    console.log(`Hint: ${info42}`);
    
    // Step 6: Get theMethodName value
    console.log("\n--- Step 6: Getting theMethodName ---");
    const theMethodName = await instance.theMethodName();
    console.log(`theMethodName: ${theMethodName}`);
    
    // Step 7: Call method7123949() as suggested by theMethodName
    console.log("\n--- Step 7: Calling method7123949() ---");
    const methodHint = await instance.method7123949();
    console.log(`Hint: ${methodHint}`);
    
    // Step 8: Get the password
    console.log("\n--- Step 8: Getting password ---");
    const password = await instance.password();
    console.log(`Password: ${password}`);
    
    // Step 9: Call authenticate with the password
    console.log("\n--- Step 9: Calling authenticate() with password ---");
    const tx = await instance.authenticate(password);
    const receipt = await tx.wait();
    console.log(`Authentication transaction successful! Hash: ${receipt.hash}`);
    
    // Step 10: Check if we cleared the challenge
    console.log("\n--- Step 10: Checking if challenge is cleared ---");
    const cleared = await instance.getCleared();
    console.log(`Challenge cleared: ${cleared}`);
    
    if (cleared) {
      console.log("\n🎉 Congratulations! You've completed the Hello Ethernaut challenge! 🎉");
    } else {
      console.log("\n❌ Something went wrong. The challenge is not cleared.");
    }
    
  } catch (error) {
    console.error("Error solving the Hello Ethernaut challenge:", error);
  }
}

// Execute the main function and handle any errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
