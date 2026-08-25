const Complaint = require('../models/Complaint');
const Worker = require('../models/Worker');
const Notification = require('../models/Notification');

// POST /api/complaints  [customer]
const createComplaint = async (req, res, next) => {
  try {
    const { workerId, bookingId, serviceCategory, subject, description, priority, imageUrl } = req.body;
    const complaint = await Complaint.create({
      customerId: req.user._id,
      workerId,
      bookingId,
      serviceCategory,
      subject,
      description,
      priority: priority || 'medium',
      imageUrl,
    });
    res.status(201).json({ complaint });
  } catch (err) {
    next(err);
  }
};

// GET /api/complaints/customer  [customer]
const getCustomerComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ customerId: req.user._id }).sort({ createdAt: -1 });
    res.json({ count: complaints.length, complaints });
  } catch (err) {
    next(err);
  }
};

// GET /api/complaints/worker  [worker]
// The core rule from the brief: a worker sees ONLY complaints that are both
// about their own service category AND filed against them specifically.
// Both filters come from the server-verified worker record, not the client.
const getWorkerComplaints = async (req, res, next) => {
  try {
    const worker = await Worker.findOne({ userId: req.user._id });
    if (!worker) return res.status(404).json({ message: 'Worker profile not found' });

    const complaints = await Complaint.find({
      workerId: worker._id,
      serviceCategory: worker.serviceCategory,
    })
      .sort({ createdAt: -1 })
      .populate('customerId', 'name');

    res.json({ count: complaints.length, complaints });
  } catch (err) {
    next(err);
  }
};

// GET /api/complaints/admin  [admin] — every complaint, every category
const getAllComplaints = async (req, res, next) => {
  try {
    const { status, serviceCategory } = req.query;
    const query = {};
    if (status) query.status = status;
    if (serviceCategory) query.serviceCategory = serviceCategory;

    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .populate('customerId', 'name email')
      .populate({ path: 'workerId', populate: { path: 'userId', select: 'name' } });

    res.json({ count: complaints.length, complaints });
  } catch (err) {
    next(err);
  }
};

// PUT /api/complaints/:id/status  [admin]
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status, adminNote },
      { new: true }
    );
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    await Notification.create({
      userId: complaint.customerId,
      title: 'Complaint update',
      message: `Your complaint "${complaint.subject}" is now ${status.replace('_', ' ')}.`,
      type: 'complaint',
    });

    res.json({ complaint });
  } catch (err) {
    next(err);
  }
};

module.exports = { createComplaint, getCustomerComplaints, getWorkerComplaints, getAllComplaints, updateComplaintStatus };
