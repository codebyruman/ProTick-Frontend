/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import { ExamSessionProvider } from './hooks/useExamSession';
import { StudentSessionLoader } from './layouts/StudentRouteGuard';
import { StudentLoginPage } from './pages/login/StudentLoginPage';
import { ExamInstructionsPage } from './pages/instructions/ExamInstructionsPage';
import { ExaminationInterfacePage } from './pages/examination/ExaminationInterfacePage';
import { ExamSubmissionPage } from './pages/submission/ExamSubmissionPage';
import { ExamCompletionPage } from './pages/submission/ExamCompletionPage';

export default function App() {
  return (
    <BrowserRouter>
      <ExamSessionProvider>
        <StudentSessionLoader>
          <Routes>
            <Route path="/" element={<Navigate to="/student/login" replace />} />
            <Route path="/student/login" element={<StudentLoginPage />} />
            <Route
              path="/instructor/login"
              element={<Navigate to="/student/login" replace />}
            />
            <Route
              path="/instructor"
              element={<Navigate to="/student/login" replace />}
            />
            <Route
              path="/student/instructions"
              element={<ExamInstructionsPage />}
            />
            <Route
              path="/student/examination"
              element={<ExaminationInterfacePage />}
            />
            <Route
              path="/student/submission"
              element={<ExamSubmissionPage />}
            />
            <Route
              path="/student/completion"
              element={<ExamCompletionPage />}
            />
            <Route
              path="/recovery/dashboard"
              element={<Navigate to="/student/login" replace />}
            />
            <Route
              path="/recovery"
              element={<Navigate to="/student/login" replace />}
            />
            <Route
              path="*"
              element={<Navigate to="/student/login" replace />}
            />
          </Routes>
        </StudentSessionLoader>
      </ExamSessionProvider>
    </BrowserRouter>
  );
}
