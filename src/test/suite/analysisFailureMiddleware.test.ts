/* --------------------------------------------------------------------------------------------
 * SonarLint for VisualStudio Code
 * Copyright (C) 2017-2025 SonarSource SA
 * sonarlint@sonarsource.com
 * Licensed under the LGPLv3 License. See LICENSE.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';
import * as vscode from 'vscode';
import { AnalysisFailureHandler } from '../../diagnostics/analysisFailureHandler';

suite('Analysis Failure Middleware Test Suite', () => {
  let analysisFailureHandler: AnalysisFailureHandler;
  let testUri: vscode.Uri;
  let middleware: any;

  setup(() => {
    // Create a new instance for each test
    analysisFailureHandler = new AnalysisFailureHandler();
    testUri = vscode.Uri.parse('file:///test/file.abl');
    
    // Create a mock middleware similar to what we have in extension.ts
    middleware = {
      handleDiagnostics: (uri: string, diagnostics: vscode.Diagnostic[], next: (uri: string, diagnostics: vscode.Diagnostic[]) => void) => {
        // Call the default handler first
        next(uri, diagnostics);
        
        // Check if we have an active analysis for this file
        const fileUri = vscode.Uri.parse(uri);
        
        // If diagnostics are empty, it might indicate an analysis failure
        // We'll report it only for ABL files to avoid false positives
        const document = { uri: fileUri, languageId: 'abl' };
        if (document && document.languageId === 'abl' && diagnostics.length === 0) {
          AnalysisFailureHandler.instance.reportAnalysisFailure(fileUri);
        } else {
          // If we have diagnostics, clear any previous analysis failure
          AnalysisFailureHandler.instance.clearAnalysisFailure(fileUri);
        }
      }
    };
    
    // Set the instance for testing
    (AnalysisFailureHandler as any)._instance = analysisFailureHandler;
  });

  test('Should report analysis failure for empty diagnostics', () => {
    // Mock the next function
    const next = (uri: string, diagnostics: vscode.Diagnostic[]) => {
      // Do nothing in the mock
    };
    
    // Call middleware with empty diagnostics
    middleware.handleDiagnostics(testUri.toString(), [], next);
    
    // Get the diagnostics collection through reflection
    const diagnosticCollection = (analysisFailureHandler as any).diagnosticCollection as vscode.DiagnosticCollection;
    
    // Get diagnostics for the test URI
    const diagnostics = diagnosticCollection.get(testUri);
    
    // Verify diagnostics are set
    assert.strictEqual(diagnostics.length, 1, 'Should have one diagnostic for empty analysis');
    assert.strictEqual(diagnostics[0].message, 'CABL scan failed. Please check logs or configuration.', 'Should have correct message');
  });

  test('Should clear analysis failure when diagnostics are present', () => {
    // First report an analysis failure
    analysisFailureHandler.reportAnalysisFailure(testUri);
    
    // Mock the next function
    const next = (uri: string, diagnostics: vscode.Diagnostic[]) => {
      // Do nothing in the mock
    };
    
    // Call middleware with non-empty diagnostics
    const mockDiagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 10),
      'Test diagnostic',
      vscode.DiagnosticSeverity.Warning
    );
    middleware.handleDiagnostics(testUri.toString(), [mockDiagnostic], next);
    
    // Get the diagnostics collection through reflection
    const diagnosticCollection = (analysisFailureHandler as any).diagnosticCollection as vscode.DiagnosticCollection;
    
    // Get diagnostics for the test URI
    const diagnostics = diagnosticCollection.get(testUri);
    
    // Verify diagnostics are cleared
    assert.strictEqual(diagnostics, undefined, 'Should have no diagnostics after successful analysis');
  });
});