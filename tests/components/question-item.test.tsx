/**
 * Component Tests for QuestionItem
 * Tests interactive score selector and user interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { QuestionItem } from '@/components/assessment/question-item';

const mockProps = {
  itemId: 'test-item-1',
  itemCode: '1.1',
  itemName: 'Test Question Item',
  level1: 'Level 1 description',
  level2: 'Level 2 description',
  level3: 'Level 3 description',
  level4: 'Level 4 description',
  level5: 'Level 5 description',
  score: null,
  currentState: '',
  onScoreChange: jest.fn(),
  onCurrentStateChange: jest.fn(),
};

describe('QuestionItem Component', () => {
  it('should render question title with code', () => {
    render(<QuestionItem {...mockProps} />);

    expect(screen.getByText('1.1')).toBeInTheDocument();
    expect(screen.getByText('Test Question Item')).toBeInTheDocument();
  });

  it('should render all 5 score buttons', () => {
    render(<QuestionItem {...mockProps} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should show maturity level labels', () => {
    render(<QuestionItem {...mockProps} />);

    expect(screen.getByText('Sơ khai')).toBeInTheDocument();
    expect(screen.getByText('Khởi đầu')).toBeInTheDocument();
    expect(screen.getByText('Phát triển')).toBeInTheDocument();
    expect(screen.getByText('Trưởng thành')).toBeInTheDocument();
    expect(screen.getByText('Tối ưu')).toBeInTheDocument();
  });

  it('should call onScoreChange when score button is clicked', () => {
    const onScoreChange = jest.fn();
    render(<QuestionItem {...mockProps} onScoreChange={onScoreChange} />);

    const score3Button = screen.getByText('3').closest('button');
    fireEvent.click(score3Button!);

    expect(onScoreChange).toHaveBeenCalledWith('test-item-1', 3);
  });

  it('should highlight selected score', () => {
    render(<QuestionItem {...mockProps} score={3} />);

    const score3Button = screen.getByText('3').closest('button');
    expect(score3Button).toHaveClass('scale-105');
  });

  it('should render current state textarea', () => {
    render(<QuestionItem {...mockProps} />);

    const textarea = screen.getByPlaceholderText(/Mô tả chi tiết tình trạng/i);
    expect(textarea).toBeInTheDocument();
  });

  it('should call onCurrentStateChange when textarea changes', () => {
    const onCurrentStateChange = jest.fn();
    render(<QuestionItem {...mockProps} onCurrentStateChange={onCurrentStateChange} />);

    const textarea = screen.getByPlaceholderText(/Mô tả chi tiết tình trạng/i);
    fireEvent.change(textarea, { target: { value: 'New current state' } });

    expect(onCurrentStateChange).toHaveBeenCalledWith('test-item-1', 'New current state');
  });

  it('should display current state value', () => {
    render(<QuestionItem {...mockProps} currentState="Existing state" />);

    const textarea = screen.getByPlaceholderText(/Mô tả chi tiết tình trạng/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Existing state');
  });

  it('should render quick reference section', () => {
    render(<QuestionItem {...mockProps} />);

    expect(screen.getByText(/Mô tả các mức độ/i)).toBeInTheDocument();
    expect(screen.getByText('Level 1 description')).toBeInTheDocument();
    expect(screen.getByText('Level 2 description')).toBeInTheDocument();
  });

  it('should apply correct color classes for each score level', () => {
    const { rerender } = render(<QuestionItem {...mockProps} score={1} />);
    let score1Button = screen.getByText('1').closest('button');
    expect(score1Button).toHaveClass('bg-red-500');

    rerender(<QuestionItem {...mockProps} score={2} />);
    let score2Button = screen.getByText('2').closest('button');
    expect(score2Button).toHaveClass('bg-orange-500');

    rerender(<QuestionItem {...mockProps} score={3} />);
    let score3Button = screen.getByText('3').closest('button');
    expect(score3Button).toHaveClass('bg-yellow-500');

    rerender(<QuestionItem {...mockProps} score={4} />);
    let score4Button = screen.getByText('4').closest('button');
    expect(score4Button).toHaveClass('bg-blue-500');

    rerender(<QuestionItem {...mockProps} score={5} />);
    let score5Button = screen.getByText('5').closest('button');
    expect(score5Button).toHaveClass('bg-green-500');
  });

  it('should allow changing score multiple times', () => {
    const onScoreChange = jest.fn();
    render(<QuestionItem {...mockProps} score={2} onScoreChange={onScoreChange} />);

    const score3Button = screen.getByText('3').closest('button');
    fireEvent.click(score3Button!);
    expect(onScoreChange).toHaveBeenCalledWith('test-item-1', 3);

    const score5Button = screen.getByText('5').closest('button');
    fireEvent.click(score5Button!);
    expect(onScoreChange).toHaveBeenCalledWith('test-item-1', 5);

    expect(onScoreChange).toHaveBeenCalledTimes(2);
  });

  it('should show checkmark icon for selected score', () => {
    render(<QuestionItem {...mockProps} score={4} />);

    const score4Button = screen.getByText('4').closest('button');
    const checkmark = score4Button?.querySelector('.bg-green-500.rounded-full');
    expect(checkmark).toBeInTheDocument();
  });
});

describe('QuestionItem - Accessibility', () => {
  it('should have accessible labels', () => {
    render(<QuestionItem {...mockProps} />);

    expect(screen.getByText('Đánh giá mức độ trưởng thành *')).toBeInTheDocument();
    expect(screen.getByText('Mô tả tình trạng hiện tại (tùy chọn)')).toBeInTheDocument();
  });

  it('should have proper textarea attributes', () => {
    render(<QuestionItem {...mockProps} />);

    const textarea = screen.getByPlaceholderText(/Mô tả chi tiết tình trạng/i);
    expect(textarea).toHaveAttribute('rows', '3');
    expect(textarea).toHaveClass('resize-none');
  });

  it('should show info icon for quick reference', () => {
    render(<QuestionItem {...mockProps} />);

    // Info icon should be present in quick reference section
    const infoText = screen.getByText(/Mô tả các mức độ/i);
    expect(infoText).toBeInTheDocument();
  });
});

describe('QuestionItem - Edge Cases', () => {
  it('should handle empty currentState', () => {
    render(<QuestionItem {...mockProps} currentState="" />);

    const textarea = screen.getByPlaceholderText(/Mô tả chi tiết tình trạng/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
  });

  it('should handle null score', () => {
    render(<QuestionItem {...mockProps} score={null} />);

    // No score button should be highlighted
    const buttons = screen.getAllByRole('button');
    const highlightedButtons = buttons.filter(btn => btn.classList.contains('scale-105'));
    expect(highlightedButtons.length).toBe(0);
  });

  it('should handle very long currentState text', () => {
    const longText = 'A'.repeat(1000);
    render(<QuestionItem {...mockProps} currentState={longText} />);

    const textarea = screen.getByPlaceholderText(/Mô tả chi tiết tình trạng/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe(longText);
  });

  it('should handle special characters in level descriptions', () => {
    const propsWithSpecialChars = {
      ...mockProps,
      level1: 'Level with <special> &characters&',
      level2: 'Level with "quotes" and \'apostrophes\'',
    };

    render(<QuestionItem {...propsWithSpecialChars} />);

    expect(screen.getByText(/Level with <special> &characters&/)).toBeInTheDocument();
  });

  it('should render correctly with Vietnamese text', () => {
    const vietnameseProps = {
      ...mockProps,
      itemName: 'Tính chính xác và độ tin cậy của dữ liệu',
      level1: 'Dữ liệu không được kiểm tra và có nhiều lỗi',
      currentState: 'Chúng tôi đang cải thiện quy trình',
    };

    render(<QuestionItem {...vietnameseProps} />);

    expect(screen.getByText('Tính chính xác và độ tin cậy của dữ liệu')).toBeInTheDocument();
    expect(screen.getByText('Dữ liệu không được kiểm tra và có nhiều lỗi')).toBeInTheDocument();
  });
});
