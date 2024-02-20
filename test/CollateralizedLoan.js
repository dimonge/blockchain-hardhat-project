const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CollateralizedLoan", function () {
  async function deployCollateralizedLoanFixture() {
    const [borrower, lender, otherAccount] = await ethers.getSigners();

    const CollateralizedLoan = await ethers.getContractFactory(
      "CollateralizedLoan"
    );
    const collateralizedLoan = await CollateralizedLoan.deploy();

    return { collateralizedLoan, borrower, lender, otherAccount };
  }

  describe("Loan Request", function () {
    it("Should allow a borrower to deposit collateral and request a loan", async function () {
      const { collateralizedLoan, borrower } = await loadFixture(
        deployCollateralizedLoanFixture
      );
      const depositAmount = ethers.parseEther("1"); // 1 ETH
      const loanAmount = ethers.parseEther("0.8"); // Requesting a loan of 0.8 ETH
      const interestRate = 10; // 10%
      const duration = 30 * 24 * 60 * 60; // 30 days in seconds

      await expect(
        collateralizedLoan
          .connect(borrower)
          .depositCollateralAndRequestLoan(loanAmount, interestRate, duration, {
            value: depositAmount,
          })
      )
        .to.emit(collateralizedLoan, "LoanRequested")
        .withArgs(0, borrower.address, loanAmount, interestRate, anyValue); // `anyValue` for the due date since it's a timestamp
    });
  });

  describe("Funding a Loan", function () {
    it("Should allow a lender to fund a loan", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(
        deployCollateralizedLoanFixture
      );
      // First, the borrower requests a loan
      const depositAmount = ethers.parseEther("1");
      const loanAmount = ethers.parseEther("0.8");
      const interestRate = 10;
      const duration = 30 * 24 * 60 * 60;
      await collateralizedLoan
        .connect(borrower)
        .depositCollateralAndRequestLoan(loanAmount, interestRate, duration, {
          value: depositAmount,
        });

      // Then, a lender funds the loan
      await expect(
        collateralizedLoan.connect(lender).fundLoan(0, { value: loanAmount })
      )
        .to.emit(collateralizedLoan, "LoanFunded")
        .withArgs(0, lender.address);
    });
  });

  describe("Repaying a Loan", function () {
    it("Should allow the borrower to repay the loan", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(
        deployCollateralizedLoanFixture
      );
      // Setup: borrower requests a loan and lender funds it
      const depositAmount = ethers.parseEther("1");
      const loanAmount = ethers.parseEther("0.8");
      const interestRate = 10n;
      const repaymentAmount = loanAmount + (loanAmount * interestRate) / 100n;
      // Loan amount plus interest
      const duration = 30 * 24 * 60 * 60;
      await collateralizedLoan
        .connect(borrower)
        .depositCollateralAndRequestLoan(loanAmount, interestRate, duration, {
          value: depositAmount,
        });
      await collateralizedLoan
        .connect(lender)
        .fundLoan(0, { value: loanAmount });

      // Repay the loan
      await expect(
        collateralizedLoan
          .connect(borrower)
          .repayLoan(0, { value: repaymentAmount })
      )
        .to.emit(collateralizedLoan, "LoanRepaid")
        .withArgs(0);
    });
  });

  describe("Claiming Collateral", function () {
    it("Should allow the lender to claim collateral if the loan is not repaid on time", async function () {
      const { collateralizedLoan, borrower, lender } = await loadFixture(
        deployCollateralizedLoanFixture
      );
      // Setup: borrower requests a loan, lender funds it
      const depositAmount = ethers.parseEther("1");
      const loanAmount = ethers.parseEther("0.8");
      const interestRate = 10;
      const duration = 30 * 24 * 60 * 60; // Loan duration
      await collateralizedLoan
        .connect(borrower)
        .depositCollateralAndRequestLoan(loanAmount, interestRate, duration, {
          value: depositAmount,
        });
      await collateralizedLoan
        .connect(lender)
        .fundLoan(0, { value: loanAmount });

      // Increase time to simulate loan not being repaid on time
      await ethers.provider.send("evm_increaseTime", [duration + 1]); // Just over the duration
      await ethers.provider.send("evm_mine", []);

      // Lender claims the collateral
      await expect(collateralizedLoan.connect(lender).claimCollateral(0))
        .to.emit(collateralizedLoan, "CollateralClaimed")
        .withArgs(0, lender.address);
    });
  });

  // Additional tests can be added to cover edge cases and failure scenarios
});
