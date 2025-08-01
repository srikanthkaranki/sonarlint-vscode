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

suite('Analysis Failure Handler Test Suite', () => {
  let analysisFailureHandler: AnalysisFailureHandler;
  let testUri: vscode.Uri;

  setup(() => {
    // Create a new instance for each test
    analysisFailureHandler = new AnalysisFailureHandler();
    testUri = vscode.Uri.parse('file:///test/file.abl');
  });

  test('Should report analysis failure', () => {
    // Report an analysis failure
    analysisFailureHandler.reportAnalysisFailure(testUri, 'Test failure');
    
    // Get the diagnostics collection through reflection (private field)
    const diagnosticCollection = (analysisFailureHandler as any).diagnosticCollection as vscode.DiagnosticCollection;
    
    // Get diagnostics for the test URI
    const diagnostics = diagnosticCollection.get(testUri);
    
    // Verify diagnostics
    assert.strictEqual(diagnostics.length, 1, 'Should have one diagnostic');
    assert.strictEqual(diagnostics[0].message, 'CABL scan failed. Please check logs or configuration.', 'Should have correct message');
    assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error, 'Should have error severity');
    assert.strictEqual(diagnostics[0].source, 'cabl-analysis-failure', 'Should have correct source');
  });

  test('Should clear analysis failure', () => {
    // First report an analysis failure
    analysisFailureHandler.reportAnalysisFailure(testUri);
    
    // Then clear it
    analysisFailureHandler.clearAnalysisFailure(testUri);
    
    // Get the diagnostics collection through reflection (private field)
    const diagnosticCollection = (analysisFailureHandler as any).diagnosticCollection as vscode.DiagnosticCollection;
    
    // Get diagnostics for the test URI
    const diagnostics = diagnosticCollection.get(testUri);
    
    // Verify diagnostics are cleared
    assert.strictEqual(diagnostics, undefined, 'Should have no diagnostics');
  });

  test('Should track analysis request and set timeout', (done) => {
    // Override the timeout value for testing
    (AnalysisFailureHandler as any).ANALYSIS_TIMEOUT_MS = 100; // 100ms for testing
    
    // Track an analysis request
    analysisFailureHandler.trackAnalysisRequest(testUri);
    
    // Get the timeouts map through reflection
    const timeoutsMap = (analysisFailureHandler as any).analysisTimeouts as Map<string, NodeJS.Timeout>;
    
    // Verify timeout is set
    assert.strictEqual(timeoutsMap.has(testUri.toString()), true, 'Should have a timeout set');
    
    // Wait for the timeout to trigger
    setTimeout(() => {
      // Get the diagnostics collection through reflection
      const diagnosticCollection = (analysisFailureHandler as any).diagnosticCollection as vscode.DiagnosticCollection;
      
      // Get diagnostics for the test URI
      const diagnostics = diagnosticCollection.get(testUri);
      
      // Verify diagnostics are set after timeout
      assert.strictEqual(diagnostics.length, 1, 'Should have one diagnostic after timeout');
      assert.strictEqual(diagnostics[0].message, 'CABL scan failed. Please check logs or configuration.', 'Should have correct message');
      
      // Verify timeout is cleared from the map
      assert.strictEqual(timeoutsMap.has(testUri.toString()), false, 'Timeout should be cleared from map');
      
      done();
    }, 200); // Wait a bit longer than the timeout
  });
});