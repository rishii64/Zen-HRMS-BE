const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ExpenseClaimItem = sequelize.define(
    "ExpenseClaimItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      claim_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      expense_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        // E.g.: Air Travel, Train Travel, Cab / Taxi, Fuel & Mileage, Hotel & Lodging, Meals & Food, Client Entertainment, Office Supplies, Communication, Other
      },
      merchant_name: {
        type: DataTypes.STRING(150),
      },
      description: {
        type: DataTypes.TEXT,
      },
      bill_number: {
        type: DataTypes.STRING(100),
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      approved_amount: {
        type: DataTypes.DECIMAL(10, 2),
      },
      tax_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
      },
      receipt_url: {
        type: DataTypes.STRING(500),
      },
      receipt_filename: {
        type: DataTypes.STRING(255),
      },
      status: {
        type: DataTypes.STRING(30),
        defaultValue: "PENDING", // PENDING, APPROVED, REJECTED
      },
      remarks: {
        type: DataTypes.STRING(255),
      },
    },
    {
      tableName: "expense_claim_items",
      timestamps: true,
      indexes: [
        { fields: ["claim_id"] },
        { fields: ["category"] },
      ],
    }
  );

  return ExpenseClaimItem;
};
