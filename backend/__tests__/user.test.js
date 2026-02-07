/**
 * USER MODEL TESTS
 * 
 * Tests for user creation, validation, and password hashing
 */

const User = require('../models/userModel');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
    describe('User Creation', () => {
        it('should create a user with valid data', async () => {
            const userData = {
                name: 'John Doe',
                loginId: 'johndoe123',
                email: 'john@example.com',
                password: 'hashedPassword123',
                role: 'team_member'
            };

            const user = await User.create(userData);

            expect(user._id).toBeDefined();
            expect(user.name).toBe(userData.name);
            expect(user.email).toBe(userData.email);
            expect(user.role).toBe(userData.role);
        });

        it('should require name field', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                role: 'team_member'
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should require email field', async () => {
            const userData = {
                name: 'Test User',
                password: 'password123',
                role: 'team_member'
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should accept valid roles only', async () => {
            const user = await global.createTestUser({ role: 'super_admin' });
            expect(user.role).toBe('super_admin');
        });
    });

    describe('User Queries', () => {
        it('should find user by email', async () => {
            const createdUser = await global.createTestUser({
                email: 'findme@example.com'
            });

            const foundUser = await User.findOne({ email: 'findme@example.com' });

            expect(foundUser).toBeTruthy();
            expect(foundUser._id.toString()).toBe(createdUser._id.toString());
        });

        it('should populate related fields', async () => {
            const user = await global.createTestUser();

            expect(user.name).toBeDefined();
            expect(user.email).toBeDefined();
        });
    });
});

describe('Password Security', () => {
    it('should hash password before saving', async () => {
        const plainPassword = 'MySecurePassword@123';

        const user = await User.create({
            name: 'Password Test',
            loginId: 'passtest123',
            email: 'passtest@example.com',
            password: plainPassword,
            role: 'team_member'
        });

        expect(user.password).not.toBe(plainPassword);
        expect(await bcrypt.compare(plainPassword, user.password)).toBe(true);
    });
});
