const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  // 1. InfoSec Awareness Campaign Model
  const InfoSecCampaign = sequelize.define(
    "InfoSecCampaign",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      campaign_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Phishing & Social Engineering",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      target_departments: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "All",
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Active", // "Active", "Scheduled", "Completed", "Archived"
      },
      mandatory: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      passing_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 80, // 80%
      },
      // JSON or stringified array of training modules / topics / guidelines
      training_modules: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // JSON or stringified array of phishing simulation scenarios & micro-quiz questions
      quiz_questions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      acknowledgment_statement: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "InfoSec Compliance Officer",
      },
    },
    {
      tableName: "infosec_campaigns",
      timestamps: true,
      underscored: true,
    }
  );

  // 2. InfoSec Employee Acknowledgment Model
  const InfoSecAcknowledgment = sequelize.define(
    "InfoSecAcknowledgment",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      campaign_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      employee_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      employee_email: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending", // "Pending", "In Progress", "Acknowledged", "Overdue"
      },
      quiz_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      quiz_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      quiz_passed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      acknowledged_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      compliance_hash: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      certificate_issued: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      certificate_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "infosec_acknowledgments",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["campaign_id", "employee_id"],
        },
      ],
    }
  );

  return { InfoSecCampaign, InfoSecAcknowledgment };
};
