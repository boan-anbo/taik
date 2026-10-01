/**
 * Tests for TranscriptView component
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TranscriptView } from '../components/TranscriptView';

describe('TranscriptView', () => {
  describe('when no text is provided', () => {
    it('should return null when both texts are empty', () => {
      const { container } = render(
        <TranscriptView partialText="" finalText="" isListening={false} />
      );

      // When component returns null, container has no children
      expect(container.firstChild).toBeNull();
    });
  });

  describe('final text display', () => {
    it('should display final text', () => {
      const { getByText } = render(
        <TranscriptView
          partialText=""
          finalText="Hello world"
          isListening={false}
        />
      );

      expect(getByText('Hello world')).toBeTruthy();
    });

    it('should show "Transcription" label with final text', () => {
      const { getByText } = render(
        <TranscriptView
          partialText=""
          finalText="Hello world"
          isListening={false}
        />
      );

      expect(getByText('Transcription')).toBeTruthy();
    });
  });

  describe('partial text display', () => {
    it('should display partial text when listening', () => {
      const { getByText } = render(
        <TranscriptView
          partialText="Hello..."
          finalText=""
          isListening={true}
        />
      );

      expect(getByText('Hello...')).toBeTruthy();
    });

    it('should show "Listening..." label when listening with partial text', () => {
      const { getByText } = render(
        <TranscriptView
          partialText="Hello..."
          finalText=""
          isListening={true}
        />
      );

      expect(getByText('Listening...')).toBeTruthy();
    });

    it('should not show partial text when not listening', () => {
      const { queryByText } = render(
        <TranscriptView
          partialText="Hello..."
          finalText="Some final text"
          isListening={false}
        />
      );

      // Partial text should not be shown when not listening
      // (unless it's the only text, in which case it would be shown as final)
      expect(queryByText('Listening...')).toBeNull();
    });
  });

  describe('combined display', () => {
    it('should show both final and partial text when listening', () => {
      const { getByText } = render(
        <TranscriptView
          partialText="typing..."
          finalText="Previous sentence. "
          isListening={true}
        />
      );

      // Use regex or function matcher for text with trailing space
      expect(getByText(/Previous sentence\./)).toBeTruthy();
      expect(getByText('typing...')).toBeTruthy();
      expect(getByText('Transcription')).toBeTruthy();
      expect(getByText('Listening...')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle very long text', () => {
      const longText = 'A'.repeat(1000);
      const { getByText } = render(
        <TranscriptView
          partialText=""
          finalText={longText}
          isListening={false}
        />
      );

      expect(getByText(longText)).toBeTruthy();
    });

    it('should handle special characters', () => {
      const specialText = "Hello! How's it going? 你好 🎤";
      const { getByText } = render(
        <TranscriptView
          partialText=""
          finalText={specialText}
          isListening={false}
        />
      );

      expect(getByText(specialText)).toBeTruthy();
    });

    it('should handle multiline text', () => {
      const multilineText = "Line 1\nLine 2\nLine 3";
      const { container } = render(
        <TranscriptView
          partialText=""
          finalText={multilineText}
          isListening={false}
        />
      );

      // Check that the text content is present in the rendered output
      expect(container.textContent).toContain('Line 1');
      expect(container.textContent).toContain('Line 2');
      expect(container.textContent).toContain('Line 3');
    });
  });
});
