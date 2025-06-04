"use client";

import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  GraduationCap, 
  TrendingUp, 
  Clock, 
  Target, 
  Award,
  BookOpen,
  BarChart3,
  Calendar,
  ChevronRight,
  AlertCircle,
  Check,
  List,
  ArrowLeft,
  FileText,
  Trophy
} from "lucide-react";
import { UserProgress, Category } from "@/types";
import { safeLocalStorage } from "@/utils/storage-utils";
import ErrorAlert from "@/components/ErrorAlert";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import WireframeBuildings from "@/components/WireframeBuildings";
import dynamic from 'next/dynamic';
import { categories } from "@/utils/category-utils";
import { validateAndFixProgress, cleanupAllProgressData } from "@/utils/progress-validator";

// Dynamic import for 3D components to avoid SSR issues
const WireframeBuildings3D = dynamic(
  () => import('@/components/WireframeBuildings3D'),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl shadow-lg p-6 h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="mt-4 text-gray-400">3Dビューを読み込んでいます...</p>
        </div>
      </div>
    )
  }
);

const BackgroundBuildings = dynamic(
  () => import('@/components/BackgroundBuildings'),
  { ssr: false }
);

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [show3D, setShow3D] = useState(false);
  const [mockExamHistory, setMockExamHistory] = useState<any[]>([]);
  const { error, isError, clearError, handleError } = useErrorHandler();


  useEffect(() => {
    // Clean up progress data on first load
    cleanupAllProgressData();
    loadUserProgress();
    loadMockExamHistory();
  }, [user]);

  const loadUserProgress = () => {
    try {
      setLoading(true);
      // Load user-specific progress from localStorage
      const userProgressKey = `userProgress_${user?.nickname}`;
      const parsedProgress = safeLocalStorage.getItem<UserProgress>(userProgressKey);
      if (parsedProgress) {
        // 進捗データの検証と修正
        const validatedProgress = validateAndFixProgress(parsedProgress);
        setProgress(validatedProgress);
      } else {
      // Initialize new user progress
      const initialCategoryProgress: Partial<Record<Category, any>> = {};
      categories.forEach(category => {
        initialCategoryProgress[category.name] = {
          totalQuestions: category.totalQuestions,
          answeredQuestions: 0,
          correctAnswers: 0
        };
      });

      const initialProgress: UserProgress = {
        totalQuestionsAnswered: 0,
        correctAnswers: 0,
        categoryProgress: initialCategoryProgress as Record<Category, any>,
        studySessions: [],
        incorrectQuestions: [],
        overcomeQuestions: [],
        currentStreak: 0,
        lastStudyDate: "",
        preferences: {
          showJapaneseInStudy: true,
          showJapaneseInMock: false,
          autoReviewIncorrect: true,
          notificationEnabled: false
        }
      };
        setProgress(initialProgress);
        safeLocalStorage.setItem(userProgressKey, initialProgress);
      }
    } catch (error) {
      handleError(error, '学習進捗の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const calculateAccuracy = () => {
    if (!progress || progress.totalQuestionsAnswered === 0) return 0;
    return Math.round((progress.correctAnswers / progress.totalQuestionsAnswered) * 100);
  };

  const calculatePassProbability = () => {
    const accuracy = calculateAccuracy();
    if (accuracy >= 70) return "高";
    if (accuracy >= 60) return "中";
    return "低";
  };

  const getStreakStatus = () => {
    if (!progress) return { message: "学習を始めましょう！", color: "text-gray-500" };
    if (progress.currentStreak === 0) return { message: "今日から始めましょう！", color: "text-gray-500" };
    if (progress.currentStreak < 3) return { message: `${progress.currentStreak}日連続！`, color: "text-orange-500" };
    if (progress.currentStreak < 7) return { message: `${progress.currentStreak}日連続！素晴らしい！`, color: "text-blue-500" };
    return { message: `${progress.currentStreak}日連続！すごい！`, color: "text-green-500" };
  };

  const getIncorrectQuestionsCount = () => {
    return progress?.incorrectQuestions?.length || 0;
  };

  const getOvercomeQuestionsCount = () => {
    return progress?.overcomeQuestions?.length || 0;
  };

  const loadMockExamHistory = () => {
    try {
      const historyKey = `mockExamHistory_${user?.nickname}`;
      const history = safeLocalStorage.getItem<any[]>(historyKey) || [];
      // 最新5件のみ表示
      setMockExamHistory(history.slice(-5).reverse());
    } catch (error) {
      console.error('Failed to load mock exam history:', error);
    }
  };

  const quickActions = [
    {
      title: "カテゴリ別学習",
      description: "各カテゴリから10問出題",
      icon: <Target className="w-6 h-6" />,
      href: "/study?mode=category",
      color: "bg-indigo-500"
    },
    {
      title: "Mock試験",
      description: "本番形式で実力チェック",
      icon: <Clock className="w-6 h-6" />,
      href: "/study?mode=mock",
      color: "bg-emerald-500"
    },
    {
      title: "間違えた問題を復習",
      description: `${getIncorrectQuestionsCount()}問の復習が可能`,
      icon: <AlertCircle className="w-6 h-6" />,
      href: "/study/session?mode=review",
      color: "bg-orange-500",
      disabled: getIncorrectQuestionsCount() === 0
    },
    {
      title: "問題リスト",
      description: "カテゴリ別の問題一覧",
      icon: <List className="w-6 h-6" />,
      href: "/questions",
      color: "bg-purple-500"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-400">学習データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // 学習カテゴリとMockカテゴリを分離
  const studyCategories = categories.filter(c => !c.name.includes("Mock"));
  const mockCategories = categories.filter(c => c.name.includes("Mock"));

  return (
    <div className="min-h-screen bg-gray-900 relative">
      {/* 3D Background */}
      <BackgroundBuildings />
      
      {/* Content with relative positioning */}
      <div className="relative z-10">
        {/* Error Alert */}
        {isError && (
          <div className="fixed top-4 right-4 z-50 max-w-md">
            <ErrorAlert 
              error={error!} 
              onClose={clearError}
              onRetry={() => {
                clearError();
                loadUserProgress();
              }}
            />
          </div>
        )}
        
        {/* Header with backdrop blur for better readability */}
        <header className="bg-gray-800/90 border-b border-gray-700 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Link href="/" className="text-gray-400 hover:text-gray-100">
                  <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-100">ダッシュボード</h1>
                  <p className="text-gray-400">こんにちは、{user?.nickname || "学習者"}さん！</p>
                </div>
              </div>
              <Link 
                href="/study" 
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                学習を始める <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* Compact Stats Summary */}
          <div className="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 p-4 mb-6 backdrop-blur-sm">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <BarChart3 className="w-5 h-5 text-indigo-600 mr-1" />
                <span className="text-xl font-bold text-gray-100">{progress.totalQuestionsAnswered}</span>
              </div>
              <p className="text-xs text-gray-400">回答済み</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <AlertCircle className="w-5 h-5 text-red-600 mr-1" />
                <span className="text-xl font-bold text-red-600">{getIncorrectQuestionsCount()}</span>
              </div>
              <p className="text-xs text-gray-400">要復習</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Check className="w-5 h-5 text-emerald-600 mr-1" />
                <span className="text-xl font-bold text-emerald-600">{getOvercomeQuestionsCount()}</span>
              </div>
              <p className="text-xs text-gray-400">克服済み</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="w-5 h-5 text-green-600 mr-1" />
                <span className="text-xl font-bold text-gray-100">{calculateAccuracy()}%</span>
              </div>
              <p className="text-xs text-gray-400">正答率</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Award className="w-5 h-5 text-yellow-600 mr-1" />
                <span className="text-xl font-bold text-gray-100">{calculatePassProbability()}</span>
              </div>
              <p className="text-xs text-gray-400">合格可能性</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Calendar className="w-5 h-5 text-purple-600 mr-1" />
                <span className={`text-xl font-bold ${getStreakStatus().color}`}>
                  {progress.currentStreak}
                </span>
              </div>
              <p className="text-xs text-gray-400">連続学習</p>
            </div>
          </div>
        </div>

        {/* Wire Art Progress */}
        {progress && progress.categoryProgress && (
          <div className="mb-8">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShow3D(!show3D)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700/90 backdrop-blur-sm hover:bg-gray-600 rounded-lg transition-colors text-gray-100"
              >
                <span className="text-lg">{show3D ? '🎨' : '🏗️'}</span>
                <span className="text-sm font-medium">{show3D ? '2D表示に切替' : '3D表示に切替'}</span>
              </button>
            </div>
            {show3D ? (
              <WireframeBuildings3D progress={progress.categoryProgress} />
            ) : (
              <WireframeBuildings progress={progress.categoryProgress} />
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-100">クイックアクション</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link 
                key={index}
                href={action.disabled ? "#" : action.href}
                className={`bg-gray-800/90 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow ${
                  action.disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={(e) => action.disabled && e.preventDefault()}
              >
                <div className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4`}>
                  {action.icon}
                </div>
                <h3 className="font-bold mb-2 text-gray-100">{action.title}</h3>
                <p className="text-gray-400 text-sm">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Category Progress */}
        <div className="space-y-6">
          {/* Study Categories */}
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700 p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-100">学習カテゴリー別進捗</h2>
            <div className="space-y-4">
              {studyCategories.map((category) => {
                const data = progress.categoryProgress[category.name];
                const percentage = data.totalQuestions > 0 
                  ? Math.round((data.answeredQuestions / data.totalQuestions) * 100)
                  : 0;
                const accuracy = data.answeredQuestions > 0
                  ? Math.round((data.correctAnswers / data.answeredQuestions) * 100)
                  : 0;

                return (
                  <div key={category.name} className="border-b pb-4 last:border-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm text-gray-200">{category.name}</h3>
                        {category.nameJa && (
                          <p className="text-xs text-gray-500">{category.nameJa}</p>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-gray-400">
                          {data.answeredQuestions}/{data.totalQuestions}問
                        </span>
                        <span className="text-gray-400">
                          正答率: {accuracy}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mock Categories */}
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700 p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-100">Mock試験進捗</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockCategories.map((category) => {
                const data = progress.categoryProgress[category.name];
                const percentage = data.totalQuestions > 0 
                  ? Math.round((data.answeredQuestions / data.totalQuestions) * 100)
                  : 0;
                const accuracy = data.answeredQuestions > 0
                  ? Math.round((data.correctAnswers / data.answeredQuestions) * 100)
                  : 0;

                return (
                  <div key={category.name} className="border border-gray-700 bg-gray-700/90 backdrop-blur-sm rounded-lg p-4">
                    <h3 className="font-medium mb-2 text-gray-200">{category.name}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">進捗:</span>
                        <span className="text-gray-200">{percentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">正答率:</span>
                        <span className={accuracy >= 70 ? 'text-green-500' : 'text-orange-500'}>
                          {accuracy}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mock試験履歴 */}
          {mockExamHistory.length > 0 && (
            <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700 p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-100 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                最近のMock試験結果
              </h2>
              <div className="space-y-3">
                {mockExamHistory.map((exam) => {
                  const date = new Date(exam.completedAt);
                  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                  
                  return (
                    <div key={exam.id} className="border border-gray-700 bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-200">
                            {exam.session.category}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {dateStr} • {exam.questionsCount}問
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${
                            exam.passed ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {exam.score}%
                          </p>
                          <p className={`text-sm ${
                            exam.passed ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {exam.passed ? '合格' : '不合格'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link 
                href="/study?mode=mock"
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
              >
                <FileText className="w-5 h-5" />
                新しいMock試験を受ける
              </Link>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}