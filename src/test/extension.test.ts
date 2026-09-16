import * as assert from 'assert';
import { suite, test } from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { isValidGitRef } from '../utils/git';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});

suite('isValidGitRef', () => {
	test('accepts normal branch names and commit hashes', () => {
		assert.strictEqual(isValidGitRef('main'), true);
		assert.strictEqual(isValidGitRef('feature/my-branch_2'), true);
		assert.strictEqual(isValidGitRef('a1b2c3d'), true);
	});

	test('rejects shell metacharacters and injection attempts', () => {
		assert.strictEqual(isValidGitRef('x; rm -rf ~'), false);
		assert.strictEqual(isValidGitRef('$(whoami)'), false);
		assert.strictEqual(isValidGitRef('branch && echo pwned'), false);
		assert.strictEqual(isValidGitRef('`id`'), false);
	});

	test('rejects values that look like flags', () => {
		assert.strictEqual(isValidGitRef('--upload-pack=evil'), false);
		assert.strictEqual(isValidGitRef('-f'), false);
	});

	test('rejects empty, whitespace, and overly long refs', () => {
		assert.strictEqual(isValidGitRef(''), false);
		assert.strictEqual(isValidGitRef('has space'), false);
		assert.strictEqual(isValidGitRef('a'.repeat(256)), false);
	});
});
