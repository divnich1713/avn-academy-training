def calculate_expected_score(rating_a: float, rating_b: float) -> float:
    """
    Calculate the expected score of player A against player B.
    rating_a: rating of player A
    rating_b: rating of player B
    """
    return 1.0 / (1.0 + 10.0 ** ((rating_b - rating_a) / 400.0))

def update_elo(student_rating: int, question_rating: int, actual_score: float, k_factor: int = 32) -> tuple[int, int]:
    """
    Calculate updated ELO ratings.
    student_rating: current ELO rating of the student
    question_rating: current ELO rating of the question
    actual_score: 1.0 for fully correct, 0.0 for incorrect, or a float between 0.0 and 1.0 for partial correct.
    Returns: (new_student_rating, new_question_rating)
    """
    expected_student = calculate_expected_score(float(student_rating), float(question_rating))
    
    # Update student rating
    new_student = student_rating + round(k_factor * (actual_score - expected_student))
    
    # Update question rating (if student gets it right, question rating decreases; and vice versa)
    # expected_question = 1.0 - expected_student
    # actual_question = 1.0 - actual_score
    # new_question = question_rating + round(k_factor * (actual_question - expected_question))
    new_question = question_rating + round(k_factor * (expected_student - actual_score))
    
    # Prevent ratings from dropping too low (e.g. minimum 100)
    new_student = max(100, new_student)
    new_question = max(100, new_question)
    
    return new_student, new_question
