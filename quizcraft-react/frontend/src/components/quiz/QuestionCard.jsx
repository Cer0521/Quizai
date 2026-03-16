export default function QuestionCard({ question, index, answer, onChange, disabled }) {
  const { question_type, question_text, options } = question
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <span className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold">{index + 1}</span>
        <div className="flex-1">
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${
            question_type === 'multiple_choice' ? 'bg-blue-100 text-blue-700'
            : question_type === 'true_false' ? 'bg-purple-100 text-purple-700'
            : question_type === 'essay' ? 'bg-orange-100 text-orange-700'
            : 'bg-green-100 text-green-700'
          }`}>
            {question_type === 'multiple_choice' ? 'Multiple Choice'
              : question_type === 'true_false' ? 'True or False'
              : question_type === 'essay' ? 'Essay'
              : 'Enumeration'}
          </span>
          <p className="text-gray-900 font-medium leading-relaxed">{question_text}</p>
        </div>
      </div>
      {question_type === 'multiple_choice' && options?.length > 0 && (
        <div className="space-y-2 pl-11">
          {options.map(opt => (
            <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
              disabled ? 'opacity-60 cursor-not-allowed' : answer?.selected_option_id === opt.id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}>
              <input type="radio" name={`q_${question.id}`} disabled={disabled}
                checked={answer?.selected_option_id === opt.id}
                onChange={() => !disabled && onChange({ selected_option_id: opt.id, answer_text: opt.option_label })}
                className="text-red-600" />
              <span className="font-semibold text-gray-500 w-5">{opt.option_label}.</span>
              <span className="text-gray-800">{opt.option_text}</span>
            </label>
          ))}
        </div>
      )}
      {question_type === 'true_false' && (
        <div className="flex gap-3 pl-11">
          {['True', 'False'].map(val => (
            <button key={val} type="button" disabled={disabled}
              onClick={() => !disabled && onChange({ answer_text: val, selected_option_id: null })}
              className={`flex-1 py-3 rounded-lg border-2 font-semibold transition ${answer?.answer_text === val ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'} disabled:opacity-60 disabled:cursor-not-allowed`}>
              {val}
            </button>
          ))}
        </div>
      )}
      {question_type === 'enumeration' && (
        <div className="pl-11">
          <input type="text" disabled={disabled} value={answer?.answer_text || ''}
            onChange={e => !disabled && onChange({ answer_text: e.target.value, selected_option_id: null })}
            placeholder="Type your answer..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed" />
        </div>
      )}
      {question_type === 'essay' && (
        <div className="pl-11">
          <textarea disabled={disabled} value={answer?.answer_text || ''}
            onChange={e => !disabled && onChange({ answer_text: e.target.value, selected_option_id: null })}
            placeholder="Write your answer here..."
            rows={5}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed resize-y" />
          <p className="text-xs text-gray-400 mt-1">Your essay will be graded by AI.</p>
        </div>
      )}
    </div>
  )
}
