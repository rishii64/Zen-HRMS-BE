const { Employee, User, CelebrationBroadcast } = require("../config/db");
const { Op } = require("sequelize");

// Master company birthday roster as explicitly specified:
// 19/03-Biswajit Bagh
// 20/04-Soumen Koley
// 21/04-Imran Khan
// 07/05-Rakesh Roshan
// 10/05-Chandrakanta Sathpathi
// 01/06-Siddheshwar Nayak
// 07/06-Aman Kumar
// 01/08-Syed Hasanain
// 07/08-Shibashish Dhole
// 11/08-Ritika Sardar
// 22/09-Priyanka Mukherjee
// 01/10-Saptarsi Mitra
const BASE_COMPANY_MEMBERS = [
  {
    name: "Biswajit Bagh",
    dobDay: 19,
    dobMonth: 3,
    department: "Engineering",
    designation: "HOD / Tech Lead",
    joiningDate: "2024-01-01",
    email: "biswajit.bagh@zentelex.com",
    avatarBg: "from-blue-500 to-indigo-600"
  },
  {
    name: "Soumen Koley",
    dobDay: 20,
    dobMonth: 4,
    department: "Engineering",
    designation: "Associate Developer",
    joiningDate: "2025-10-02", // 1-year milestone on 02/10
    email: "soumen.koley@zentelex.com",
    avatarBg: "from-emerald-500 to-teal-600"
  },
  {
    name: "Imran Ali",
    dobDay: 21,
    dobMonth: 4,
    department: "Digital Marketing",
    designation: "Digital Marketing Executive",
    joiningDate: "2025-05-15",
    email: "imran.ali@zentelex.com",
    avatarBg: "from-amber-500 to-orange-600"
  },
  {
    name: "Rakesh Roshan",
    dobDay: 7,
    dobMonth: 5,
    department: "Operations",
    designation: "Operations Executive",
    joiningDate: "2025-08-01",
    email: "rakesh.roshan@zentelex.com",
    avatarBg: "from-purple-500 to-violet-600"
  },
  {
    name: "Chandrakanta Sathpathi",
    dobDay: 10,
    dobMonth: 5,
    department: "Engineering",
    designation: "Backend Engineer",
    joiningDate: "2025-04-10",
    email: "chandrakanta.s@zentelex.com",
    avatarBg: "from-pink-500 to-rose-600"
  },
  {
    name: "Siddheshwar Nayak",
    dobDay: 1,
    dobMonth: 6,
    department: "Finance & Accounts",
    designation: "Accounts Manager",
    joiningDate: "2025-12-25",
    email: "siddheshwar.nayak@zentelex.com",
    avatarBg: "from-cyan-500 to-blue-600"
  },
  {
    name: "Aman Kumar",
    dobDay: 7,
    dobMonth: 6,
    department: "Engineering",
    designation: "Associate Developer",
    joiningDate: "2025-09-01",
    email: "aman.kumar@zentelex.com",
    avatarBg: "from-indigo-500 to-purple-600"
  },
  {
    name: "Saif",
    dobDay: 1,
    dobMonth: 8,
    department: "Digital Marketing",
    designation: "UI/UX Designer",
    joiningDate: "2025-07-15",
    email: "syed.hasanain@zentelex.com",
    avatarBg: "from-emerald-500 to-green-600"
  },
  {
    name: "Shibashish Dhole",
    dobDay: 7,
    dobMonth: 8,
    department: "Digital Marketing",
    designation: "Digital Marketing Executive",
    joiningDate: "2025-06-01",
    email: "shibashish.dhole@zentelex.com",
    avatarBg: "from-sky-500 to-blue-600"
  },
  {
    name: "Ritika Sardar",
    dobDay: 11,
    dobMonth: 8,
    department: "Digital Marketing",
    designation: "UI/UX Designer",
    joiningDate: "2025-11-10",
    email: "ritika.sardar@zentelex.com",
    avatarBg: "from-fuchsia-500 to-pink-600"
  },
  {
    name: "Priyanka Mukherjee",
    dobDay: 22,
    dobMonth: 9,
    department: "Human Resources",
    designation: "HR Manager",
    joiningDate: "2026-03-03",
    email: "priyanka.mukherjee@zentelex.com",
    avatarBg: "from-rose-500 to-red-600"
  },
  {
    name: "Saptarsi Mitra",
    dobDay: 1,
    dobMonth: 10,
    department: "Engineering",
    designation: "Associate Engineer",
    joiningDate: "2026-07-06",
    email: "saptarsi.mitra@zentelex.com",
    avatarBg: "from-violet-500 to-indigo-600"
  }
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Helper to normalize dates and compute countdowns
const buildCelebrationsData = (dbEmployees = []) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate();

  // Midnight today for accurate day difference
  const todayMidnight = new Date(currentYear, now.getMonth(), currentDay);

  // Map base roster and look for matching DB employees to supplement data
  const roster = BASE_COMPANY_MEMBERS.map((member, index) => {
    // Try matching DB employee by name similarity
    const matchedDb = dbEmployees.find((e) => {
      const dbFullName = `${e.first_name || ""} ${e.last_name || ""}`.trim().toLowerCase();
      const mName = member.name.toLowerCase();
      return dbFullName.includes(mName) || mName.includes(dbFullName);
    });

    const joiningDate = matchedDb?.joining_date || member.joiningDate;
    const designation = matchedDb?.designation || member.designation;
    const department = matchedDb?.dept || member.department;
    const avatar = matchedDb?.profile_photo || null;

    // Calculate next birthday date & days left
    let nextBdayYear = currentYear;
    let bdayThisYear = new Date(currentYear, member.dobMonth - 1, member.dobDay);

    if (bdayThisYear < todayMidnight) {
      // Birthday already occurred this calendar year -> Next is next year
      nextBdayYear = currentYear + 1;
    }

    const nextBdayDate = new Date(nextBdayYear, member.dobMonth - 1, member.dobDay);
    const diffTime = nextBdayDate.getTime() - todayMidnight.getTime();
    const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const isToday = member.dobDay === currentDay && member.dobMonth === currentMonth;
    const isTomorrow = daysLeft === 1;

    // Tenure and 1-Year Milestone calculation
    let tenureYears = 0;
    let tenureMonths = 0;
    let completedOneYear = false;
    let isAnniversaryToday = false;
    let isOneYearAnniversaryToday = false;

    if (joiningDate) {
      const jDate = new Date(joiningDate);
      if (!isNaN(jDate.getTime())) {
        const joinYear = jDate.getFullYear();
        const joinMonth = jDate.getMonth() + 1;
        const joinDay = jDate.getDate();

        let yDiff = currentYear - joinYear;
        let mDiff = currentMonth - joinMonth;
        let dDiff = currentDay - joinDay;

        if (dDiff < 0) {
          mDiff -= 1;
        }
        if (mDiff < 0) {
          yDiff -= 1;
          mDiff += 12;
        }

        tenureYears = Math.max(0, yDiff);
        tenureMonths = Math.max(0, mDiff);

        completedOneYear = tenureYears >= 1;

        if (joinDay === currentDay && joinMonth === currentMonth && yDiff > 0) {
          isAnniversaryToday = true;
          if (yDiff === 1) {
            isOneYearAnniversaryToday = true;
          }
        }
      }
    }

    const dateStr = `${String(member.dobDay).padStart(2, "0")}/${String(member.dobMonth).padStart(2, "0")}`;
    const formattedDate = `${String(member.dobDay).padStart(2, "0")} ${MONTH_SHORT[member.dobMonth - 1]}`;
    const fullDateText = `${member.dobDay} ${MONTH_NAMES[member.dobMonth - 1]}`;

    return {
      id: matchedDb?.id || `base-${index + 1}`,
      employeeId: matchedDb?.employee_id || `EMP-${index + 1}`,
      name: member.name,
      dobDay: member.dobDay,
      dobMonth: member.dobMonth,
      dateStr,
      formattedDate,
      fullDateText,
      monthName: MONTH_NAMES[member.dobMonth - 1],
      department,
      designation,
      joiningDate,
      avatar,
      avatarBg: member.avatarBg,
      daysLeft,
      isToday,
      isTomorrow,
      tenureYears,
      tenureMonths,
      completedOneYear,
      isAnniversaryToday,
      isOneYearAnniversaryToday
    };
  });

  // Sort birthdays by upcoming daysLeft (Today first, then 1 day, 2 days, etc.)
  const sortedUpcoming = [...roster].sort((a, b) => a.daysLeft - b.daysLeft);

  // Group by month for calendar view
  const byMonth = {};
  MONTH_NAMES.forEach((m) => {
    byMonth[m] = [];
  });
  roster.forEach((item) => {
    byMonth[item.monthName].push(item);
  });
  // Sort items within each month by day
  Object.keys(byMonth).forEach((m) => {
    byMonth[m].sort((a, b) => a.dobDay - b.dobDay);
  });

  // Identify today's celebrations
  const todaysBirthdays = roster.filter((m) => m.isToday);
  const todaysAnniversaries = roster.filter((m) => m.isAnniversaryToday);
  const oneYearCompletedMembers = roster.filter((m) => m.completedOneYear);

  return {
    birthdays: sortedUpcoming,
    byMonth,
    todaysBirthdays,
    todaysAnniversaries,
    oneYearCompletedMembers,
    totalCount: roster.length
  };
};

// In-memory celebrations cache to eliminate database load on dashboard visits
let celebrationsCache = {
  data: null,
  timestamp: 0,
  ttl: 60 * 1000 // 60 seconds TTL
};

function invalidateCelebrationsCache() {
  celebrationsCache.data = null;
  celebrationsCache.timestamp = 0;
}

class CelebrationController {
  // GET /api/auth/celebrations
  static async getCelebrations(req, res) {
    try {
      const now = Date.now();
      if (celebrationsCache.data && (now - celebrationsCache.timestamp) < celebrationsCache.ttl) {
        return res.status(200).json({
          success: true,
          data: celebrationsCache.data,
          cached: true
        });
      }

      let dbEmployees = [];
      try {
        dbEmployees = await Employee.findAll({
          attributes: ["id", "employee_id", "first_name", "last_name", "dept", "designation", "joining_date", "dob", "profile_photo"],
          raw: true
        });
      } catch (err) {
        console.warn("Could not query employees for celebrations:", err.message);
      }

      const data = buildCelebrationsData(dbEmployees);

      // Fetch active broadcast within the last 24 hours
      let activeBroadcast = null;
      try {
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
        activeBroadcast = await CelebrationBroadcast.findOne({
          where: {
            is_active: true,
            createdAt: {
              [Op.gte]: oneDayAgo
            }
          },
          order: [["createdAt", "DESC"]]
        });
      } catch (bErr) {
        console.warn("Could not fetch active broadcast:", bErr.message);
      }

      const payload = {
        ...data,
        activeBroadcast
      };

      celebrationsCache = {
        data: payload,
        timestamp: now,
        ttl: 60 * 1000
      };

      return res.status(200).json({
        success: true,
        data: payload
      });
    } catch (error) {
      console.error("Error in getCelebrations:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch celebrations data",
        error: error.message
      });
    }
  }

  // POST /api/auth/celebrations/broadcast
  // Allows notifying everyone of a selected birthday or anniversary event
  static async broadcastCelebration(req, res) {
    try {
      const { type = "birthday", employeeName, eventDate, title, message } = req.body;

      if (!employeeName) {
        return res.status(400).json({
          success: false,
          message: "employeeName is required for celebration broadcast"
        });
      }

      const defaultTitle =
        type === "anniversary"
          ? `🎉 1-Year Work Anniversary Celebration: ${employeeName}!`
          : `🎂 Birthday Celebration: Happy Birthday, ${employeeName}!`;

      const defaultMessage =
        type === "anniversary"
          ? `Congratulations to ${employeeName} on completing 1 year of dedication and excellence at Zentelex IT Solutions! Let's celebrate this proud milestone together!`
          : `Today we celebrate ${employeeName}'s Birthday! 🎂 Let's wish them a wonderful day filled with joy, happiness, and continued success!`;

      // Deactivate older active broadcasts of the same type or all older broadcasts
      try {
        await CelebrationBroadcast.update(
          { is_active: false },
          { where: { is_active: true } }
        );
      } catch (e) {
        console.warn("Could not deactivate previous broadcasts:", e.message);
      }

      const broadcast = await CelebrationBroadcast.create({
        type,
        employee_name: employeeName,
        event_date: eventDate || new Date().toISOString().split("T")[0],
        title: title || defaultTitle,
        message: message || defaultMessage,
        created_by: req.user?.name || req.body?.createdBy || "Team Zentelex",
        is_active: true
      });

      // Invalidate cache immediately so new broadcast propagates
      invalidateCelebrationsCache();

      return res.status(201).json({
        success: true,
        message: `Celebration notification successfully broadcasted for ${employeeName}!`,
        broadcast
      });
    } catch (error) {
      console.error("Error in broadcastCelebration:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to broadcast celebration",
        error: error.message
      });
    }
  }

  // GET /api/auth/celebrations/active-broadcast
  static async getActiveBroadcast(req, res) {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const broadcast = await CelebrationBroadcast.findOne({
        where: {
          is_active: true,
          createdAt: {
            [Op.gte]: oneDayAgo
          }
        },
        order: [["createdAt", "DESC"]]
      });

      return res.status(200).json({
        success: true,
        broadcast
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch active broadcast",
        error: error.message
      });
    }
  }

  // POST /api/auth/celebrations/dismiss-broadcast
  static async dismissBroadcast(req, res) {
    try {
      const { id } = req.body;
      if (id) {
        await CelebrationBroadcast.update({ is_active: false }, { where: { id } });
      } else {
        await CelebrationBroadcast.update({ is_active: false }, { where: { is_active: true } });
      }

      // Invalidate cache
      invalidateCelebrationsCache();

      return res.status(200).json({
        success: true,
        message: "Celebration broadcast dismissed"
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to dismiss broadcast",
        error: error.message
      });
    }
  }
}

module.exports = CelebrationController;
