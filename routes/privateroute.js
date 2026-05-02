import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Project from "../models/Project.js";
import Task from "../models/TaskSchema.js";

const privaterouter = express.Router();
privaterouter.get("/getprojects", async (req, res) => {
  try {
    const projects = await Project.find({
      "members.user": req.user.id,
    });

    const projectIds = projects.map((project) => project._id);

    const tasks = await Task.find({
      project: { $in: projectIds },
    });

    const formattedProjects = projects.map((project) => {
      const member = project.members.find(
        (m) => m.user.toString() === req.user.id
      );

      const projectTasks = tasks.filter(
        (task) => task.project.toString() === project._id.toString()
      );

      const totalTasks = projectTasks.length;

      const completedTasks = projectTasks.filter(
        (task) => task.status === "done"
      ).length;

      const progress =
        totalTasks === 0
          ? 0
          : Math.round((completedTasks / totalTasks) * 100);

      return {
        id: project._id,
        title: project.title,
        description: project.description || "",
        members: project.members.length,
        tasks: totalTasks,
        role: member?.role === "admin" ? "Admin" : "Member",
        progress,
      };
    });

    return res.status(200).json({
      message: "Projects fetched successfully",
      projects: formattedProjects,
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Server error",
    });
  }
});
privaterouter.get("/project/:id", async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate("members.user", "name email");

        if (!project) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        res.status(200).json({
            project,
        });

    } catch (err) {
        res.status(500).json({
            message: "Server error",
        });
    }
});
privaterouter.put("/addmember/:projectId", async (req, res) => {
    try {
        const { email } = req.body;

        const project = await Project.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const isAdmin = project.members.find(
            (member) =>
                member.user.toString() === req.user.id &&
                member.role === "admin"
        );

        if (!isAdmin) {
            return res.status(403).json({ message: "Only admin can add members" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const alreadyMember = project.members.find(
            (member) => member.user.toString() === user._id.toString()
        );

        if (alreadyMember) {
            return res.status(400).json({ message: "User already member" });
        }

        project.members.push({
            user: user._id,
            role: "member",
        });

        await project.save();

        return res.status(200).json({
            message: "Member added successfully",
            project,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error" });
    }
});
privaterouter.post("/createtask", async (req, res) => {
    try {
        const {
            title,
            description,
            project,
            assignedTo,
            deadline,
            priority,
        } = req.body;

        // 🔥 validation
        if (!title || !project || !assignedTo) {
            return res.status(400).json({
                message: "Title, project and assigned user required",
            });
        }

        // 🔥 check project exists
        const foundProject = await Project.findById(project);

        if (!foundProject) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        // 🔥 check admin
        const isAdmin = foundProject.members.find(
            (m) =>
                m.user.toString() === req.user.id &&
                m.role === "admin"
        );

        if (!isAdmin) {
            return res.status(403).json({
                message: "Only admin can create task",
            });
        }

        // 🔥 check assigned user is in project
        const isMember = foundProject.members.find(
            (m) => m.user.toString() === assignedTo
        );

        if (!isMember) {
            return res.status(400).json({
                message: "User is not part of this project",
            });
        }

        // ✅ create task
        const task = await Task.create({
            title,
            description,
            project,
            assignedTo,
            createdBy: req.user.id,
            deadline,
            priority,
        });

        return res.status(201).json({
            message: "Task created successfully",
            task,
        });

    } catch (err) {
        console.log(err);

        return res.status(500).json({
            message: "Server error",
        });
    }
});
privaterouter.get("/tasks/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    // 🔥 check project exists
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // 🔥 check user is part of project
    const isMember = project.members.find(
      (m) => m.user.toString() === req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    // ✅ fetch tasks
    const tasks = await Task.find({
      project: projectId,
    })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Tasks fetched successfully",
      tasks,
    });

  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Server error",
    });
  }
});
privaterouter.put("/task/:taskId/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["todo", "in-progress", "done"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project = await Project.findById(task.project);

    const currentMember = project.members.find(
      (m) => m.user.toString() === req.user.id
    );

    if (!currentMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    const isAdmin = currentMember.role === "admin";
    const isAssignedUser = task.assignedTo.toString() === req.user.id;

    if (!isAdmin && !isAssignedUser) {
      return res.status(403).json({
        message: "You can update only your assigned task",
      });
    }

    task.status = status;
    await task.save();

    return res.status(200).json({
      message: "Task status updated",
      task,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
});
// get all tasks
privaterouter.get("/mytasks", async (req, res) => {
  try {
    const tasks = await Task.find({
      assignedTo: req.user.id,
    })
      .populate("project", "title")
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "My tasks fetched successfully",
      tasks,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
privaterouter.post("/createproject", async (req, res) => {
    try {
        const { title, description } = req.body;
        let projectexists = await Project.findOne({ title: title })
        // if(projectexists){
        //     return res.status(400).json({message:"Project already exists"})
        // }

        // ✅ validation
        if (!title) {
            return res.status(400).json({
                message: "Title is required",
            });
        }

        // ✅ create project
        const project = await Project.create({
            title,
            description,

            createdBy: req.user.id, // from JWT middleware

            members: [
                {
                    user: req.user.id,
                    role: "admin",
                },
            ],
        });

        return res.status(201).json({
            message: "Project created successfully",
            project,
        });

    } catch (err) {
        console.log(err);

        return res.status(500).json({
            message: "Server error",
        });
    }
});
// Get User Info


privaterouter.get("/profile", async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name email createdAt");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const projects = await Project.find({
      "members.user": req.user.id,
    });

    const tasks = await Task.find({
      assignedTo: req.user.id,
    });

    const completed = tasks.filter((task) => task.status === "done").length;

    return res.status(200).json({
      message: "Profile fetched successfully",
      user: {
        name: user.name,
        email: user.email,
        joined: new Date(user.createdAt).toLocaleDateString(),
        projects: projects.length,
        tasks: tasks.length,
        completed,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
});
privaterouter.get("/dashboard", async (req, res) => {
  try {
    const projects = await Project.find({
      "members.user": req.user.id,
    }).sort({ createdAt: -1 });

    const projectIds = projects.map((p) => p._id);

    const myTasks = await Task.find({
      assignedTo: req.user.id,
    })
      .populate("project", "title")
      .sort({ createdAt: -1 });

    const allProjectTasks = await Task.find({
      project: { $in: projectIds },
    });

    const completed = allProjectTasks.filter(
      (task) => task.status === "done"
    ).length;

    const pending = allProjectTasks.filter(
      (task) => task.status !== "done"
    ).length;

    const overdue = allProjectTasks.filter(
      (task) =>
        task.deadline &&
        new Date(task.deadline) < new Date() &&
        task.status !== "done"
    ).length;

    const formattedProjects = projects.slice(0, 3).map((project) => {
      const member = project.members.find(
        (m) => m.user.toString() === req.user.id
      );

      const projectTasks = allProjectTasks.filter(
        (task) => task.project.toString() === project._id.toString()
      );

      return {
        id: project._id,
        name: project.title,
        tasks: projectTasks.length,
        members: project.members.length,
        role: member?.role === "admin" ? "Admin" : "Member",
      };
    });

    const formattedTasks = myTasks.slice(0, 5).map((task) => ({
      id: task._id,
      title: task.title,
      project: task.project?.title || "-",
      status: task.status,
      deadline: task.deadline,
    }));

    return res.status(200).json({
      stats: [
        { title: "Projects", value: projects.length },
        { title: "Tasks", value: allProjectTasks.length },
        { title: "Completed", value: completed },
        { title: "Pending", value: pending },
        { title: "Overdue", value: overdue },
      ],
      projects: formattedProjects,
      tasks: formattedTasks,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
});
export default privaterouter;
