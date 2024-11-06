const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt'); 
const session = require('express-session'); 

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Set up session middleware
app.use(session({
    secret: 'your_secret_key', 
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'library_system'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to database');
});

// API to handle user registration with password hashing
app.post('/register', (req, res) => {
    const { fullName, email, phone, address, password } = req.body;

    // Hash the user's password before storing it in the database
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Error hashing password:', err);
            res.json({ success: false, message: 'User registration failed! Please try again.' });
        } else {
            // Insert the user with the hashed password into the database
            const query = 'INSERT INTO Users (full_name, email, phone_number, address, password) VALUES (?, ?, ?, ?, ?)';
            db.query(query, [fullName, email, phone, address, hashedPassword], (err, result) => {
                if (err) {
                    console.error('Error inserting user:', err);
                    res.json({ success: false, message: 'User registration failed! Please try again.' });
                } else {
                    res.json({ success: true, message: 'User registered successfully!' });
                }
            });
        }
    });
});

// API to handle user login with password verification
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Find the user by email
    const query = 'SELECT * FROM Users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            res.json({ success: false, message: 'An error occurred during login!' });
        } else if (results.length === 0) {
            res.json({ success: false, message: 'Invalid email or password.' });
        } else {
            const user = results[0];

            // Compare the provided password with the stored hashed password
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) {
                    console.error('Error comparing passwords:', err);
                    res.json({ success: false, message: 'An error occurred during login!' });
                } else if (!isMatch) {
                    res.json({ success: false, message: 'Invalid email or password.' });
                } else {
                    res.json({ success: true, message: 'Login successful!' });
                }
            });
        }
    });
});

// API to handle user logout
app.post('/logout', (req, res) => {
    // Destroy the session and log the user out
    req.session.destroy((err) => {
        if (err) {
            return res.json({ success: false, message: 'Logout failed!' });
        }
        res.json({ success: true, message: 'Logged out successfully!' });
    });
});


app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login.html'); 
    }
    res.sendFile(__dirname + '/dashboard.html'); 
});
// API to get the logged-in user's information
app.get('/getUserInfo', (req, res) => {
    console.log('Session data:', req.session); // Add this to debug session data
    if (req.session.user) {
        return res.json({ success: true, user: req.session.user });
    } else {
        return res.json({ success: false, message: 'No user is logged in.' });
    }
});


// API to handle adding a book
app.post('/addBook', (req, res) => {
    const { title, author, isbn, publication_year, genre } = req.body;

    if (!title || !author || !isbn || !publication_year || !genre) {
        return res.json({ success: false, message: 'All fields are required.' });
    }

    const query = 'INSERT INTO Books (title, author, isbn, publication_year, genre, status) VALUES (?, ?, ?, ?, ?, "available")';
    db.query(query, [title, author, isbn, publication_year, genre], (err, result) => {
        if (err) {
            console.error('Error adding book:', err);
            return res.json({ success: false, message: 'Failed to add book. ISBN may already exist.' });
        }
        res.json({ success: true, message: 'Book added successfully!' });
    });
});

// API to update book details
app.put('/updateBook', (req, res) => {
    const { isbn, title, author, publication_year, genre } = req.body;

    if (!isbn || !title || !author || !publication_year || !genre) {
        return res.json({ success: false, message: 'All fields are required.' });
    }

    const query = 'UPDATE Books SET title = ?, author = ?, publication_year = ?, genre = ? WHERE isbn = ?';
    db.query(query, [title, author, publication_year, genre, isbn], (err, result) => {
        if (err) {
            console.error('Error updating book:', err);
            return res.json({ success: false, message: 'Failed to update book.' });
        }

        if (result.affectedRows === 0) {
            return res.json({ success: false, message: 'Book not found with that ISBN.' });
        }

        res.json({ success: true, message: 'Book updated successfully!' });
    });
});

// API to remove a book by ISBN
app.delete('/removeBook', (req, res) => {
    const { isbn } = req.body;

    if (!isbn) {
        return res.json({ success: false, message: 'ISBN is required to remove a book.' });
    }

    const query = 'DELETE FROM Books WHERE isbn = ?';
    db.query(query, [isbn], (err, result) => {
        if (err) {
            console.error('Error removing book:', err);
            return res.json({ success: false, message: 'Failed to remove book.' });
        }

        if (result.affectedRows === 0) {
            return res.json({ success: false, message: 'No book found with that ISBN.' });
        }

        res.json({ success: true, message: 'Book removed successfully!' });
    });
});

// API to handle book search
app.post('/searchBooks', (req, res) => {
    const { searchCriteria, searchInput } = req.body;

    if (!searchCriteria || !searchInput) {
        return res.json({ success: false, message: 'Search criteria and input are required.' });
    }

    let query;
    switch (searchCriteria) {
        case 'title':
            query = 'SELECT * FROM Books WHERE title LIKE ?';
            break;
        case 'author':
            query = 'SELECT * FROM Books WHERE author LIKE ?';
            break;
        case 'isbn':
            query = 'SELECT * FROM Books WHERE isbn LIKE ?';
            break;
        case 'genre':
            query = 'SELECT * FROM Books WHERE genre LIKE ?';
            break;
        default:
            return res.json({ success: false, message: 'Invalid search criteria.' });
    }

    db.query(query, [`%${searchInput}%`], (err, results) => {
        if (err) {
            console.error('Error searching for books:', err);
            return res.json({ success: false, message: 'An error occurred during the search.' });
        }

        res.json({ success: true, books: results });
    });
});

// API to handle user search
app.post('/searchUsers', (req, res) => {
    const { searchCriteria, searchInput } = req.body;

    if (!searchCriteria || !searchInput) {
        return res.json({ success: false, message: 'Search criteria and input are required.' });
    }

    let query;
    switch (searchCriteria) {
        case 'name':
            query = 'SELECT * FROM Users WHERE full_name LIKE ?';
            break;
        case 'user_id':
            query = 'SELECT * FROM Users WHERE user_id = ?';
            break;
        case 'email':
            query = 'SELECT * FROM Users WHERE email LIKE ?';
            break;
        case 'phone_number':
            query = 'SELECT * FROM Users WHERE phone_number LIKE ?';
            break;
        default:
            return res.json({ success: false, message: 'Invalid search criteria.' });
    }

    const searchValue = searchCriteria === 'user_id' ? searchInput : `%${searchInput}%`;

    db.query(query, [searchValue], (err, results) => {
        if (err) {
            console.error('Error searching for users:', err);
            return res.json({ success: false, message: 'An error occurred during the search.' });
        }

        res.json({ success: true, users: results });
    });
});

// API to handle user details update
app.put('/updateUser', (req, res) => {
    const { full_name, email, phone, address } = req.body;

    const userId = req.session.user?.id;

    if (!userId) {
        return res.json({ success: false, message: 'You must be logged in to update your details.' });
    }

    if (!full_name || !email || !phone || !address) {
        return res.json({ success: false, message: 'All fields are required.' });
    }

    const query = 'UPDATE Users SET full_name = ?, email = ?, phone_number = ?, address = ? WHERE user_id = ?';
    db.query(query, [full_name, email, phone, address, userId], (err, result) => {
        if (err) {
            console.error('Error updating user details:', err);
            return res.json({ success: false, message: 'Failed to update details.' });
        }

        res.json({ success: true, message: 'Details updated successfully.' });
    });
});
// API to issue a book to a user and record it in BorrowedBooks table
app.post('/issueBook', (req, res) => {
    const { book_id, user_id, due_date } = req.body;

    
    if (!book_id || !user_id || !due_date) {
        return res.json({ success: false, message: 'All fields are required.' });
    }

    // Insert into BorrowedBooks table with status 'borrowed'
    const query = 'INSERT INTO BorrowedBooks (user_id, book_id, borrow_date, due_date, status) VALUES (?, ?, NOW(), ?, "borrowed")';
    db.query(query, [user_id, book_id, due_date], (err, result) => {
        if (err) {
            console.error('Error issuing book:', err);
            return res.json({ success: false, message: 'Failed to issue book. Please try again.' });
        }
        res.json({ success: true, message: 'Book issued successfully!' });
    });
});

// API to return a book
app.post('/returnBook', (req, res) => {
    const { book_id } = req.body;

    const query = 'UPDATE BorrowedBooks SET status = "returned", return_date = NOW() WHERE book_id = ? AND status = "borrowed"';
    db.query(query, [book_id], (err, result) => {
        if (err) {
            return res.json({ success: false, message: 'Failed to return book.' });
        }
        if (result.affectedRows === 0) {
            return res.json({ success: false, message: 'No book found or already returned.' });
        }
        res.json({ success: true, message: 'Book returned successfully!' });
    });
});

// API to renew a book
app.post('/renewBook', (req, res) => {
    const { book_id, new_due_date } = req.body;

    const query = 'UPDATE BorrowedBooks SET due_date = ? WHERE book_id = ? AND status = "borrowed"';
    db.query(query, [new_due_date, book_id], (err, result) => {
        if (err) {
            return res.json({ success: false, message: 'Failed to renew book.' });
        }
        if (result.affectedRows === 0) {
            return res.json({ success: false, message: 'No book found or cannot be renewed.' });
        }
        res.json({ success: true, message: 'Book renewed successfully!' });
    });
});


const FINE_PER_DAY = 0.50; 

// API to fetch notifications for due dates and overdue books
app.get('/notifications', (req, res) => {
    const userId = req.session.user?.id;

    if (!userId) {
        return res.json({ success: false, message: 'You must be logged in to view notifications.' });
    }

    // Query to fetch due date reminders and overdue notices
    const query = `
        SELECT bb.book_id, b.title, bb.due_date, 
        DATEDIFF(CURDATE(), bb.due_date) AS overdue_days, 
        CASE 
            WHEN CURDATE() > bb.due_date THEN 'overdue'
            ELSE 'due_soon'
        END AS status
        FROM BorrowedBooks bb
        JOIN Books b ON bb.book_id = b.book_id
        WHERE bb.user_id = ? AND bb.status = 'borrowed'
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching notifications:', err);
            return res.json({ success: false, message: 'Failed to fetch notifications.' });
        }

        // Prepare the notifications response
        const notifications = results.map(book => {
            const isOverdue = book.status === 'overdue';
            const fineAmount = isOverdue ? FINE_PER_DAY * book.overdue_days : 0;
            return {
                book_id: book.book_id,
                title: book.title,
                due_date: book.due_date,
                overdue_days: book.overdue_days,
                fine: fineAmount.toFixed(2),
                status: book.status
            };
        });

        res.json({ success: true, notifications });
    });
});
app.post('/requestBook', (req, res) => {
    const { bookName, email } = req.body;
    if (!bookName || !email) {
        return res.json({ success: false, message: 'Book name and email are required.' });
    }

    const query = 'INSERT INTO Requests (book_name, email) VALUES (?, ?)';
    db.query(query, [bookName, email], (err, result) => {
        if (err) {
            console.error('Error adding request:', err);
            return res.json({ success: false, message: 'Failed to submit request. Please try again.' });
        }
        res.json({ success: true, message: 'Request submitted successfully!' });
    });
});




// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});


