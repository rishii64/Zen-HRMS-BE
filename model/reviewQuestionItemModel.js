const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ReviewQuestionItem = sequelize.define(
    "ReviewQuestionItem",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      review_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      question_key: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      weightage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 20.0,
      },
      self_rating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      self_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      tl_rating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      tl_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      manager_rating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      manager_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hod_rating: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      hod_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "review_question_items",
      timestamps: true,
      underscored: true,
    }
  );

  return ReviewQuestionItem;
};
