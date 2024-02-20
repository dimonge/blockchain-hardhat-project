// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Collateralized Loan Contract
contract CollateralizedLoan {
    // Define the structure of a loan
    struct Loan {
        address borrower;
        // Hint: Add a field for the lender's address
        address lender;
        uint collateralAmount;
        // Hint: Add fields for loan amount, interest rate, due date, isFunded, isRepaid
        uint loanAmount;
        uint interestRate;
        uint dueDate;
        bool isFunded;
        bool isRepaid;
    }

    // Create a mapping to manage the loans
    mapping(uint => Loan) public loans;
    uint public nextLoanId;

    // Hint: Define events for loan requested, funded, repaid, and collateral claimed
    event LoanRequested(uint loanId, address borrower, uint loanAmount, uint interestRate, uint dueDate);
    event LoanFunded(uint loanId, address lender);
    event LoanRepaid(uint loanId);
    event CollateralClaimed(uint loanId, address lender);

    // Custom Modifiers
    // Hint: Write a modifier to check if a loan exists
    modifier loanExists(uint _loanId) {
        require(_loanId < nextLoanId, "Loan does not exist");
        _;
    }
    // Hint: Write a modifier to ensure a loan is not already funded
    modifier notAlreadyFunded(uint _loanId) {
        require(!loans[_loanId].isFunded, "Loan is already funded");
        _;
    }
    // Function to deposit collateral and request a loan
    function depositCollateralAndRequestLoan(uint _loanAmount, uint _interestRate, uint _duration) external payable {
        // Hint: Check if the collateral is more than 0
        require(msg.value > 0, "Collateral amount must be more than 0");
        // Hint: Calculate the loan amount based on the collateralized amount
        // Hint: Increment nextLoanId and create a new loan in the loans mapping
        uint loanId = nextLoanId++;
        
        loans[loanId] = Loan({
            borrower: msg.sender,
            lender: address(0),
            collateralAmount: msg.value,
            loanAmount: _loanAmount,
            interestRate: _interestRate,
            dueDate: block.timestamp + _duration,
            isFunded: false,
            isRepaid: false
        });
        // Hint: Emit an event for loan request
        emit LoanRequested(loanId, msg.sender, _loanAmount, _interestRate, block.timestamp + _duration);
    }

    // Function to fund a loan
    // Hint: Write the fundLoan function with necessary checks and logic
    function fundLoan(uint _loanId) external payable loanExists(_loanId) notAlreadyFunded(_loanId) {
        Loan storage loan = loans[_loanId];
        require(msg.value == loan.loanAmount, "Amount to be funded must be equal to loan amount");

        loan.lender = msg.sender;
        loan.isFunded = true;
        payable(loan.borrower).transfer(msg.value);

        emit LoanFunded(_loanId, msg.sender);
    }

    // Function to repay a loan
    // Hint: Write the repayLoan function with necessary checks and logic
    function repayLoan(uint _loanId) external payable loanExists(_loanId) {
        Loan storage loan = loans[_loanId];
        require(loan.isFunded, "Loan must be funded");
        require(!loan.isRepaid, "Loan is already repaid");
        require(msg.sender == loan.borrower, "Only borrower can repay the loan");
        require(msg.value == loan.loanAmount + (loan.loanAmount * loan.interestRate) / 100, "Repayment amount does not match.");
        

        loan.isRepaid = true;
        payable(loan.lender).transfer(msg.value);

        emit LoanRepaid(_loanId);
    }
    // Function to claim collateral on default
    // Hint: Write the claimCollateral function with necessary checks and logic
    function claimCollateral(uint _loanId) external loanExists(_loanId) {
        Loan storage loan = loans[_loanId];
        require(loan.isFunded, "Loan must be funded");
        require(!loan.isRepaid, "Loan is already repaid");
        require(block.timestamp >= loan.dueDate, "Loan is not due yet");
        //require(msg.sender == loan.lender, "Only lender can claim the collateral");

        payable(loan.lender).transfer(loan.collateralAmount);
        loan.collateralAmount = 0;

        emit CollateralClaimed(_loanId, msg.sender);
    }
}