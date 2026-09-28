const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Resignation = sequelize.define(
    "Resignation",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      dept: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "General",
      },
      designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      joining_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      last_working_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      notice_period: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "1 month",
      },
      reason: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      reason_details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      schedule_exit_interview: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      interview_preferred_date: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      interview_mode: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "In person",
      },
      handover_person_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      handover_person_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      handover_target_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      handover_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reassign_items_to_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      reassign_items_to_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      email_forwarding_to_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      email_forwarding_to_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      ack_claims_expenses: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ack_final_pay: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ack_return_assets: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending Manager Approval", // "Draft", "Pending Manager Approval", "Pending HR Approval", "Approved", "Rejected", "Cancelled"
      },
      tl_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      tl_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      tl_decision: {
        type: DataTypes.STRING(50),
        allowNull: true, // "Approved", "Rejected", "Pending"
      },
      tl_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      tl_action_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      tl_recommended_lwd: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      manager_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      manager_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      manager_decision: {
        type: DataTypes.STRING(50),
        allowNull: true, // "Approved", "Rejected", "Pending"
      },
      manager_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      manager_action_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      manager_recommended_lwd: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      hod_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      hod_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      hod_decision: {
        type: DataTypes.STRING(50),
        allowNull: true, // "Approved", "Rejected", "Pending"
      },
      hod_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hod_action_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      hod_recommended_lwd: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      hr_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      hr_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      hr_decision: {
        type: DataTypes.STRING(50),
        allowNull: true, // "Approved", "Rejected", "Pending"
      },
      hr_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hr_action_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      hr_confirmed_lwd: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      approval_stage: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "PENDING_TL_OR_MANAGER",
      },
      withdrawn_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      withdrawn_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      withdrawal_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      clearance_raised: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      clearance_raised_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      clearance_raised_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      clearance_steps: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      clearance_overall_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Not Raised", // "Not Raised", "In Progress", "Completed"
      },
      exit_interview_raised: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      exit_interview_raised_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      exit_interview_raised_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      exit_interview_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Not Scheduled", // "Not Scheduled", "Scheduled", "Completed", "Waived"
      },
      exit_interview_date: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      exit_interview_time: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      exit_interview_interviewer: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      exit_interview_mode: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      exit_interview_location: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      exit_interview_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      exit_interview_questions: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      exit_interview_feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      notifications: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      clearance_it_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending", // "Pending", "Cleared"
      },
      clearance_finance_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending",
      },
      clearance_admin_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending",
      },
      clearance_hr_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending",
      },
      handover_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "NOT_ASSIGNED", // "NOT_ASSIGNED", "ASSIGNED", "SUBMITTED_BY_EMPLOYEE", "CONFIRMED_BY_ASSIGNEE"
      },
      handover_assigned_by_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      handover_assigned_by_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      handover_assigned_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      handover_employee_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      handover_employee_completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      handover_assignee_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      handover_assignee_confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      handover_docs_checklist: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
    },
    {
      tableName: "resignations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Resignation;
};
