import React, { useState } from "react";
import "../../Styles/HolderComponents/QuizContainer.css";
import API_ENDPOINTS from "../../config/apiConfig";

const QuizContainer = ({ userData }) => {
  const user_id = userData?.user?.user_id;

  const [documentId, setDocumentId] = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);

  const [quiz, setQuiz] = useState(null);          // full quiz data{quiz_id, questions[]}
  const [userAnswers, setUserAnswers] = useState({});
  const [result, setResult] = useState(null);

  const documents = userData?.documents || [];

      // GENERATE QUIZ
  const generateQuiz = async () => {
    if (!documentId) return alert("Select a document first");

    const res = await fetch(API_ENDPOINTS.GENERATE_QUIZ, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id,
        document_id: documentId,
        num_questions: numQuestions,
      }),
    });

    const data = await res.json();
    console.log("QUIZ RECEIVED:", data);

    if (!data.status) {
      alert("Failed to generate quiz");
      return;
    }

    //Store full quiz including quiz_id
    setQuiz({
      quiz_id: data.quiz_id,
      questions: data.quiz.questions,
    });

    setUserAnswers({});
    setResult(null);
  };

      // VALIDATE QUIZ
  const validateQuiz = async () => {
    if (!quiz) return;

    const res = await fetch(API_ENDPOINTS.VALIDATE_QUIZ, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quiz_id: quiz.quiz_id,
        user_id,
        answers: userAnswers,
      }),
    });

    const data = await res.json();
    console.log("VALIDATION RESULT:", data);

    setResult(data);
  };

      // store user answer
  const handleAnswer = (qIndex, optionKey) => {
    setUserAnswers({ ...userAnswers, [qIndex]: optionKey });
  };

      // safe checks
  if (quiz && (!quiz.questions || !Array.isArray(quiz.questions))) {
    return (
      <div className="quiz-container">
        <h2>Error: Quiz data is invalid</h2>
      </div>
    );
  }

  return (
    <div className="quiz-container">
          {/* selecr pdf and no of qn */}
          <h1 className="quiz-title"> Practice Quiz</h1>
      {!quiz && (
        <>
        <div className="quiz-container-selection-input">

            <div className="quiz-container-input-box">
                <label>Select Document:</label>
                <select  value={documentId || ""} onChange={(e) => setDocumentId(e.target.value)}>
                    <option value="">Select PDF</option>
                    {documents.map((d) => (
                        <option key={d.document_id} value={d.document_id}>
                            {d.filename}
                        </option>
                    ))}
                </select>
            </div>

            <div className="quiz-container-input-box">
                <label>Number of Questions:</label>
                <input
                    type="text"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(e.target.value)}
                    min="1"
                    max="20"
                />
            </div>

          <button className="quiz-generate-btn" onClick={generateQuiz}>
            Generate Quiz
          </button>
        </div>


        </>
      )}

          {/* display quiz */}
      {quiz && !result && (
        <div className="quiz-section">
          {quiz.questions.map((q, index) => (
            <div key={index} className="quiz-question-box">
              <h3>{index + 1}. {q.question}</h3>

              {q.options.map((op, i) => {
                const key = ["A", "B", "C", "D"][i];
                return (
                  <label key={i} className="quiz-option">
                    <input
                      type="radio"
                      name={`q${index + 1}`}
                      onChange={() => handleAnswer(index + 1, key)}
                    />
                    {key}. {op}
                  </label>
                );
              })}
            </div>
          ))}

          <button className="quiz-submit-btn" onClick={validateQuiz}>
            Submit Answers
          </button>
        </div>
      )}

          {/* show results */}
      {result && (
        <div className="quiz-result-box">
          <h2>Your Score: {result.score} / {result.total}</h2>

          {result.details.map((d, i) => (
            <div key={i} className="quiz-result-detail">
                <p><strong>Q{i+1}:</strong> {d.question}</p>

                <p>Your answer: {d.your_answer} — 
                {quiz.questions[i].options["ABCD".indexOf(d.your_answer)]}
                </p>

                <p>Correct answer: {d.correct_answer} — 
                {quiz.questions[i].options["ABCD".indexOf(d.correct_answer)]}
                </p>
            </div>
            ))}


        <button
            className="quiz-generate-btn"
            onClick={() => {
                setQuiz(null);
                setResult(null);
                setUserAnswers({});
            }}
            >
            Generate More Questions
        </button>

        </div>
      )}
    </div>
  );
};

export default QuizContainer;
