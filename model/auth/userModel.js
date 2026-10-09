const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
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

      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },

      work_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      personal_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "employee",
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Active",
      },

      employment_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Permanent", // "Permanent", "Probation", "Intern"
      },

      current_salary: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },

      dept: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      group_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "TATA Company",
      },

      company_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "TATA Steel",
      },

      work_location: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "Kolkata",
      },

      weekly_off: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "Sunday", // Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Rotational
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

      pan_no: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      aadhaar_no: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      driving_license: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      doc_pan: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      doc_aadhaar: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      doc_payslips: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      doc_exp_cert: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      doc_last_company: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      uploaded_documents: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      last_company_details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      salary_structure: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      facilities: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      esi_threshold: {
        type: DataTypes.NUMERIC,
        allowNull: true,
      },
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: true,
    }
  );

  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  return User;
};