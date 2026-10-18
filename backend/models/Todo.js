import mongoose from 'mongoose';

const todoSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  title: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 300 
  },
  description: { 
    type: String, 
    default: '', 
    trim: true,
    maxlength: 2000 
  },
  dueDate: { 
    type: Date, 
    default: null 
  },
  category: { 
    type: String, 
    enum: ['government-exams', 'iit-neet', 'skills', 'other', 'general'], 
    default: 'general' 
  },
  completed: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  completedAt: { 
    type: Date, 
    default: null 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  }
});

todoSchema.index({ userId: 1, completed: 1, createdAt: -1 });
todoSchema.index({ userId: 1, dueDate: 1 });

export default mongoose.model('Todo', todoSchema);
