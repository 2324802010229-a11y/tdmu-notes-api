const express = require('express');
const os = require('os');
const mongoose = require('mongoose');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Khởi tạo Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const upload = multer({ storage: multer.memoryStorage() });

// Định nghĩa Schema & Model cho Note
const noteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, default: '' },
  tags: [{ type: String }],
  attachmentUrl: { type: String, default: null }
}, { timestamps: true });

const Note = mongoose.model('Note', noteSchema);

// Route kiểm tra hệ thống
app.get('/', (req, res) => {
  res.json({
    message: 'Xin chào từ đám mây!',
    host: os.hostname(),
    time: new Date().toISOString()
  });
});

// 1. Tạo mới ghi chú (HTTP 201)
app.post('/notes', async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title không được để trống' });
    }
    const note = await Note.create({ title, content, tags });
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2a. Lấy danh sách ghi chú (lọc theo tag nếu có)
app.get('/notes', async (req, res) => {
  try {
    const filter = req.query.tag ? { tags: req.query.tag } : {};
    const notes = await Note.find(filter).sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2b. Lấy chi tiết ghi chú theo ID
app.get('/notes/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID không hợp lệ' });
    }
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });
    res.status(200).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Cập nhật ghi chú
app.put('/notes/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID không hợp lệ' });
    }
    const { title, content, tags } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title không được để trống' });
    }
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { title, content, tags },
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });
    res.status(200).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Đính kèm tệp lên Supabase Storage
app.post('/notes/:id/attachment', upload.single('file'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID không hợp lệ' });
    }
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });
    if (!req.file) return res.status(400).json({ error: 'Vui lòng gửi kèm file' });

    const bucket = process.env.SUPABASE_BUCKET || 'attachments';
    const filePath = `${req.params.id}/${Date.now()}-${req.file.originalname}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    note.attachmentUrl = data.publicUrl;
    await note.save();

    res.status(200).json({ attachmentUrl: note.attachmentUrl, note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Xóa ghi chú (HTTP 204)
app.delete('/notes/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID không hợp lệ' });
    }
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ error: 'Không tìm thấy ghi chú' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;