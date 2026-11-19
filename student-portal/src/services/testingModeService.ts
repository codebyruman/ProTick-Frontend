/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ExaminationInstructions,
  ExaminationSessionInfo,
  OptionKey,
  PaperVersion,
  StudentIdentity,
  StudentQuestion,
} from '../types/examination';
import {
  RecoveryAuditLog,
  SessionTransferRecord,
  StudentRecoveryOverview,
} from '../types/recovery';
import { INSTITUTION_NAME, PORTAL_NAME } from '../assets/brandAssets';

const TESTING_MODE_STORAGE_KEY = 'mitm_frontend_testing_mode_active_v1';
const TESTING_DATA_SEED_KEY = 'mitm_frontend_testing_data_seed_v1';

// Pool of realistic student names for MIT Mysore simulation
const FIRST_NAMES = [
  'Aarav', 'Diya', 'Sinchana', 'Prajwal', 'Kavya', 'Rohan', 'Meera', 'Aditya',
  'Ananya', 'Varun', 'Neha', 'Girish', 'Pooja', 'Tanvi', 'Kiran', 'Deepika',
  'Siddharth', 'Bhavana', 'Darshan', 'Sneha', 'Nikhil', 'Shreya', 'Chetan',
];

const LAST_NAMES = [
  'Sharma', 'Nair', 'Bhat', 'Hegde', 'Kulkarni', 'Gowda', 'Rao', 'Patil',
  'Joshi', 'Shetty', 'Prasad', 'Kumar', 'Murthy', 'Deshmukh', 'Kamath',
];

const SUBJECTS = [
  { code: 'BCS501', name: 'Operating Systems & System Software' },
  { code: 'BCS502', name: 'Database Management Systems' },
  { code: 'BCS503', name: 'Computer Networks & Security' },
  { code: 'BCS504', name: 'Design and Analysis of Algorithms' },
  { code: 'BCS505', name: 'Theory of Computation & Automata' },
];

const QUESTION_TOPIC_TEMPLATES = [
  {
    topic: 'Process Synchronization',
    prompt: 'In a preemptive operating system, how does a counting semaphore handle multiple concurrent process requests?',
    options: {
      A: 'By decrementing the semaphore value and blocking the calling process when the value falls below zero',
      B: 'By resetting the program counter to the start of the critical region',
      C: 'By terminating the lowest priority process currently executing in user mode',
      D: 'By converting all concurrent threads into single-threaded kernel tasks',
    },
    correct: 'A' as OptionKey,
  },
  {
    topic: 'Memory Management',
    prompt: 'Which page replacement algorithm suffers from Belady’s Anomaly where allocating more page frames causes more page faults?',
    options: {
      A: 'Least Recently Used (LRU)',
      B: 'First-In, First-Out (FIFO)',
      C: 'Optimal Page Replacement (OPT)',
      D: 'Working Set Model with Clock Hand algorithm',
    },
    correct: 'B' as OptionKey,
  },
  {
    topic: 'Deadlock Detection',
    prompt: 'According to Coffman’s criteria, which condition is NOT strictly required for a system deadlock to occur?',
    options: {
      A: 'Mutual exclusion on non-shareable resources',
      B: 'Hold and wait condition',
      C: 'Mandatory preemption of allocated resources by high-priority tasks',
      D: 'Circular wait chain among processes',
    },
    correct: 'C' as OptionKey,
  },
  {
    topic: 'Virtual Memory & TLB',
    prompt: 'When a Translation Lookaside Buffer (TLB) miss occurs, what immediate action is taken by the hardware memory management unit?',
    options: {
      A: 'The CPU raises a page fault exception directly to the operating system trap handler',
      B: 'The MMU performs a multi-level page table walk in physical RAM to retrieve the frame number',
      C: 'The executing process is permanently terminated and memory is reclaimed',
      D: 'The cache controller invalidates all entries in the L1 data cache',
    },
    correct: 'B' as OptionKey,
  },
  {
    topic: 'CPU Scheduling',
    prompt: 'In Multi-Level Feedback Queue (MLFQ) scheduling, how does the scheduler prevent starvation of CPU-bound processes?',
    options: {
      A: 'By periodically boosting the priority of aging processes to the highest priority queue',
      B: 'By strictly enforcing equal time quanta across every level of the queue hierarchy',
      C: 'By assigning interactive I/O tasks to the lowest priority queue indefinitely',
      D: 'By disabling interrupts whenever a CPU-bound thread enters the running state',
    },
    correct: 'A' as OptionKey,
  },
  {
    topic: 'File System Architecture',
    prompt: 'In Unix inode-based file allocation, what is the primary purpose of indirect blocks?',
    options: {
      A: 'To store directory permissions and user group identifiers',
      B: 'To expand the file size beyond the limited number of direct block pointers in the inode structure',
      C: 'To cache disk sectors in volatile memory buffers for high-speed read operations',
      D: 'To encrypt file data at rest using hardware-accelerated AES instructions',
    },
    correct: 'B' as OptionKey,
  },
  {
    topic: 'Inter-Process Communication',
    prompt: 'Which IPC mechanism provides the highest throughput for exchanging large datasets between local processes?',
    options: {
      A: 'POSIX Shared Memory (shm_open / mmap)',
      B: 'Unix Domain Sockets using stream mode',
      C: 'Named FIFOs with synchronous blocking reads',
      D: 'Message Queues with kernel message buffering',
    },
    correct: 'A' as OptionKey,
  },
  {
    topic: 'Disk Scheduling',
    prompt: 'Why is the C-SCAN (Circular SCAN) disk scheduling algorithm preferred over standard SCAN in high-load server environments?',
    options: {
      A: 'It provides a more uniform wait time for requests across both inner and outer disk cylinders',
      B: 'It completely eliminates head movement latency on solid-state drives',
      C: 'It always serves the request closest to the current head position regardless of direction',
      D: 'It requires zero rotational delay when accessing contiguous block sectors',
    },
    correct: 'A' as OptionKey,
  },
  {
    topic: 'Security & Protection Rings',
    prompt: 'Which of the following operations is strictly restricted to Kernel Mode (Ring 0) in modern x86/x64 architectures?',
    options: {
      A: 'Modifying the page table base register (CR3)',
      B: 'Calling arithmetic instructions on general-purpose registers',
      C: 'Allocating user-space memory via malloc() or brk()',
      D: 'Executing function calls through user stack frames',
    },
    correct: 'A' as OptionKey,
  },
  {
    topic: 'I/O Subsystems',
    prompt: 'What is the key performance benefit of Direct Memory Access (DMA) during bulk I/O transfers?',
    options: {
      A: 'It allows peripheral controllers to transfer data directly to RAM without continuous CPU intervention',
      B: 'It increases the physical bandwidth of the DDR bus beyond memory specifications',
      C: 'It automatically compresses disk sectors before writing to secondary storage',
      D: 'It removes the need for device driver interrupt handlers in the kernel',
    },
    correct: 'A' as OptionKey,
  },
];

export interface GeneratedTestData {
  student: StudentIdentity;
  examSession: ExaminationSessionInfo;
  instructions: ExaminationInstructions;
  questions: StudentQuestion[];
  recoveryRecords: StudentRecoveryOverview[];
  transferHistory: SessionTransferRecord[];
  auditLogs: RecoveryAuditLog[];
  generatedAt: string;
}

class TestingModeService {
  private active: boolean = false;
  private currentData: GeneratedTestData | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initFromStorage();
  }

  private initFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(TESTING_MODE_STORAGE_KEY);
      this.active = stored === 'true';
      if (this.active) {
        const cached = sessionStorage.getItem(TESTING_DATA_SEED_KEY);
        if (cached) {
          this.currentData = JSON.parse(cached);
        } else {
          this.regenerateTestData();
        }
      }
    } catch {
      this.active = false;
      this.currentData = null;
    }
  }

  public isTestingModeActive(): boolean {
    return this.active;
  }

  public enableTestingMode(): GeneratedTestData {
    this.active = true;
    try {
      localStorage.setItem(TESTING_MODE_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    const data = this.regenerateTestData();
    this.notify();
    return data;
  }

  public disableTestingMode(): void {
    this.active = false;
    this.currentData = null;
    try {
      localStorage.removeItem(TESTING_MODE_STORAGE_KEY);
      sessionStorage.removeItem(TESTING_DATA_SEED_KEY);
    } catch {
      // ignore
    }
    this.notify();
  }

  public clearTestData(): void {
    this.disableTestingMode();
  }

  public regenerateTestData(): GeneratedTestData {
    const data = this.generateRandomDataset();
    this.currentData = data;
    try {
      sessionStorage.setItem(TESTING_DATA_SEED_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
    this.notify();
    return data;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('TestingMode notification error:', err);
      }
    });
  }

  public getTestData(): GeneratedTestData | null {
    if (!this.active) return null;
    if (!this.currentData) {
      this.currentData = this.regenerateTestData();
    }
    return this.currentData;
  }

  private generateRandomDataset(): GeneratedTestData {
    const randomSeed = Math.floor(Math.random() * 10000);
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const fullName = `${firstName} ${lastName}`;

    const yearSuffix = 22 + Math.floor(Math.random() * 3);
    const usnNum = String(Math.floor(Math.random() * 150) + 1).padStart(3, '0');
    const usn = `4MH${yearSuffix}CS${usnNum}`;

    const birthYear = 2004 + Math.floor(Math.random() * 2);
    const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const dateOfBirth = `${birthYear}-${birthMonth}-${birthDay}`;

    const pcNum = String(Math.floor(Math.random() * 30) + 1).padStart(2, '0');
    const workstationId = `LAB01-PC-${pcNum}`;
    const versions: PaperVersion[] = ['A', 'B', 'C', 'D'];
    const assignedVersion = versions[Math.floor(Math.random() * versions.length)];

    const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
    const sessionId = `SES-CSE-5A-${subject.code}-${Date.now().toString(36).toUpperCase()}`;

    const student: StudentIdentity = {
      usn,
      fullName,
      dateOfBirth,
      department: 'Computer Science & Engineering',
      semester: '5th Semester',
      section: Math.random() > 0.5 ? 'Section A' : 'Section B',
      assignedVersion,
      assignedWorkstationId: workstationId,
      sessionToken: `TEST-SES-${usn}-${Date.now().toString(36)}`,
    };

    const examSession: ExaminationSessionInfo = {
      examinationId: `EXAM-TEST-${Date.now().toString(36)}`,
      sessionId,
      cycleName: 'Continuous Internal Evaluation (CIE-I)',
      examinationType: 'Internal Assessment – I (Computer-Based MCQ)',
      sessionSlot: 'Morning Slot (09:30 AM – 10:45 AM)',
      subjectCode: subject.code,
      subjectName: subject.name,
      department: student.department,
      semester: student.semester,
      section: student.section,
      durationMinutes: 45,
      totalQuestions: 30,
      totalMarks: 30,
      marksPerCorrect: 1,
      negativeMarkingPerWrong: 0,
      laboratoryName: 'CSE Central Computing Lab 01',
      selectedPaperLabel: `${subject.code} (Question Paper)`,
      scheduledDate: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      startTime: '09:30 AM',
      endTime: '10:15 AM',
      availabilityState: 'ACTIVE',
      availabilityMessage: 'Testing Mode session active. Random test records generated.',
      instructionsAvailable: true,
      assignedVersion,
      workstationId,
    };

    const instructions: ExaminationInstructions = {
      examinationId: examSession.examinationId,
      sessionId: examSession.sessionId,
      institutionName: 'Maharaja Institute of Technology Mysore',
      subjectCode: subject.code,
      subjectName: subject.name,
      examinationType: 'Internal Assessment – I (Computer-Based MCQ)',
      scheduledDate: examSession.scheduledDate,
      startTime: '09:30 AM',
      endTime: '10:15 AM',
      sessionSlot: examSession.sessionSlot,
      laboratoryName: 'CSE Central Computing Lab 01',
      durationMinutes: 45,
      totalQuestions: 30,
      totalMarks: 30,
      marksPerCorrect: 1,
      negativeMarkingPerWrong: 0,
      generalRules: [
        'Each question carries 1 mark. There is no negative marking for incorrect attempts.',
        'Use "Save & Next" to record your response with the server.',
        'The question palette on the right indicates question status in real time.',
        'Do not exit full-screen mode or navigate away during the active examination.',
      ],
      navigationRules: [
        'Click any question number in the palette to navigate directly.',
        'Use Previous and Save & Next for sequential movement.',
      ],
      answerModificationRules: [
        'Answers can be cleared or changed at any time prior to submission.',
        'Answered questions marked for review will be evaluated.',
      ],
      submissionAndAutoSubmitRules: [
        'Examination automatically submits when the countdown timer reaches zero.',
        'Click Submit Examination in the palette to complete your exam.',
      ],
    };

    // Generate 30 randomized questions
    const questions: StudentQuestion[] = [];
    for (let i = 1; i <= 30; i++) {
      const template = QUESTION_TOPIC_TEMPLATES[(i - 1) % QUESTION_TOPIC_TEMPLATES.length];
      const moduleNum = ((i - 1) % 5) + 1;
      const questionId = `Q-${subject.code}-${assignedVersion}-${String(i).padStart(2, '0')}`;

      // Randomize option order slightly to ensure freshness
      const optionKeys: OptionKey[] = ['A', 'B', 'C', 'D'];
      const rawOptions = [
        { text: template.options.A, isCorrect: template.correct === 'A' },
        { text: template.options.B, isCorrect: template.correct === 'B' },
        { text: template.options.C, isCorrect: template.correct === 'C' },
        { text: template.options.D, isCorrect: template.correct === 'D' },
      ];

      // Shuffle options based on random seed
      const shuffledOptions = [...rawOptions].sort(() => Math.random() - 0.5);

      const options = optionKeys.map((key, optIdx) => ({
        optionKey: key,
        optionId: `OPT-${questionId}-${key}`,
        text: shuffledOptions[optIdx]?.text || `Option ${key}`,
      }));

      questions.push({
        questionId,
        displayNumber: i,
        moduleNumber: moduleNum,
        moduleTitle: `Module ${moduleNum}: Core Principles`,
        questionText: `[Question ${i}] ${template.prompt}`,
        options,
      });
    }

    // Generate randomized recovery records for emergency console
    const recoveryRecords: StudentRecoveryOverview[] = [];
    const transferHistory: SessionTransferRecord[] = [];
    const auditLogs: RecoveryAuditLog[] = [];

    const mockScenarios: Array<{
      status: 'Active' | 'Interrupted' | 'Recovery Pending' | 'Submitted';
      hasReloggedIn?: boolean;
    }> = [
      { status: 'Active' },
      { status: 'Interrupted' },
      { status: 'Recovery Pending' }, // Permission granted for Any PC; candidate not re-logged in yet
      { status: 'Active', hasReloggedIn: true }, // Candidate crashed on PC-04, re-logged in & resumed on PC-09!
      { status: 'Submitted' },
      { status: 'Active' },
    ];

    for (let idx = 0; idx < mockScenarios.length; idx++) {
      const scenario = mockScenarios[idx];
      const recFirst = FIRST_NAMES[(idx * 3 + randomSeed) % FIRST_NAMES.length];
      const recLast = LAST_NAMES[(idx * 2 + randomSeed) % LAST_NAMES.length];
      const recUsn = `4MH23CS${String(idx + 10).padStart(3, '0')}`;
      const recStatus = scenario.status;
      const initialWorkstation = `LAB01-PC-${String(idx + 1).padStart(2, '0')}`;
      const reloginWorkstation = scenario.hasReloggedIn ? `LAB01-PC-09` : undefined;
      const answered = Math.floor(Math.random() * 25) + 2;

      recoveryRecords.push({
        usn: recUsn,
        studentName: `${recFirst} ${recLast}`,
        department: 'Computer Science & Engineering',
        laboratory: 'CSE Examination Lab 1',
        examination: `${subject.code} – ${subject.name}`,
        status: recStatus,
        currentQuestion: answered + 1,
        totalQuestions: 30,
        answeredCount: answered,
        lastSaved: new Date(Date.now() - idx * 60000).toLocaleTimeString('en-IN'),
        previousSystemId: initialWorkstation,
        currentSystemId: reloginWorkstation || initialWorkstation,
        reloginSystemId: reloginWorkstation,
        recoveryStatus:
          recStatus === 'Interrupted'
            ? 'Available'
            : recStatus === 'Recovery Pending'
            ? 'Pending Authorisation'
            : scenario.hasReloggedIn
            ? 'Already Recovered'
            : 'Not Applicable (Submitted)',
        canAuthorise: recStatus === 'Interrupted',
      });

      if (scenario.hasReloggedIn) {
        transferHistory.push({
          transferId: `TRF-${Date.now().toString(36)}-${idx}`,
          studentUsn: recUsn,
          studentName: `${recFirst} ${recLast}`,
          examinationId: examSession.examinationId,
          previousSystemId: initialWorkstation,
          newSystemId: reloginWorkstation!,
          authorisedAt: new Date(Date.now() - 15 * 60000).toISOString(),
          reloginAt: new Date(Date.now() - 5 * 60000).toISOString(),
          authorisedBy: 'EMGR-LOGIN-01 (Lab Instructor)',
          lastSavedQuestionIndex: answered,
          answersRecoveredCount: answered,
          remainingSeconds: 2400,
          status: 'SUCCESS',
        });
      }
    }

    auditLogs.push(
      {
        logId: `AUD-${Date.now().toString(36)}-01`,
        timestamp: new Date().toLocaleTimeString('en-IN'),
        action: 'TEST_MODE_ACTIVATED',
        actor: 'Frontend Testing Controller',
        details: `Generated fresh randomized test data for session ${sessionId}.`,
      },
      {
        logId: `AUD-${Date.now().toString(36)}-02`,
        timestamp: new Date(Date.now() - 300000).toLocaleTimeString('en-IN'),
        action: 'COE_CONFIG_UPDATE',
        actor: 'Lab Security Monitor',
        details: 'Randomized candidate session parameters verified and locked.',
      }
    );

    return {
      student,
      examSession,
      instructions,
      questions,
      recoveryRecords,
      transferHistory,
      auditLogs,
      generatedAt: new Date().toLocaleTimeString('en-IN'),
    };
  }
}

export const testingModeService = new TestingModeService();
