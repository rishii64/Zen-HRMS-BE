const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Employee = sequelize.define(
    "Employee",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },

      first_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      last_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },

      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Active",
      },

      job_role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "employee",
      },

      dept: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      current_salary: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },

      joining_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      reporting_manager: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "N/A",
      },

      phone_no: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      kpi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      tabs_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      enabled_tabs: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "1,2,3,4",
      },

      dob: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      gender: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      nationality: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      address_current: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      address_permanent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      emergency_contact_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      emergency_contact_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      education: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      family_details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      doc_resume: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      doc_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      doc_cert: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      profile_photo: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      blood_group: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },

      religion: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      total_experience: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      previous_experience: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      marital_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      certifications: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      passport_visa: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      bank_details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      document_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Not Uploaded",
      },

      salary_structure: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "employees",
      timestamps: false,
      underscored: true,
    }
  );

  return Employee;
};